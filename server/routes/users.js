const express = require('express');
const path = require('path');
const prisma = require('../prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { verifyToken, verifyAdmin, JWT_SECRET } = require('../middleware/auth');
const { validateEmail, validatePassword } = require('../utils/validation');

const router = express.Router();

// GET /api/employees - List all employees and their stats (Admin only)
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { search, trackId, page = 1, limit = 25 } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        console.log(`[API] FETCH /api/users: page=${pageNum}, limit=${limitNum}, search=${search}, trackId=${trackId}`);

        // Fetch all users for stats and filtering
        // Note: For very large datasets, this should be optimized with separate aggregation queries
        const employees = await prisma.user.findMany({
            include: {
                tracks: {
                    where: { status: 'PUBLISHED' },
                    include: {
                        modules: { where: { status: 'PUBLISHED' } }
                    }
                },
                enrollments: {
                    include: { module: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Map and calculate progress for ALL employees (to keep stats accurate)
        const allData = employees.map(emp => {
            let totalModulesGlobal = 0;
            let totalCompletedGlobal = 0;

            const trackProgressDetails = emp.tracks.map(track => {
                const trackModuleIds = track.modules.map(m => m.id);
                const totalModules = trackModuleIds.length;
                const completedInTrack = emp.enrollments.filter(
                    e => e.completed && trackModuleIds.includes(e.moduleId)
                ).length;

                totalModulesGlobal += totalModules;
                totalCompletedGlobal += completedInTrack;

                const progress = totalModules > 0 ? Math.round((completedInTrack / totalModules) * 100) : 0;

                const quizModules = track.modules.filter(m => m.type === 'QUIZ');
                const quizTotal = quizModules.length;
                const quizCompleted = emp.enrollments.filter(
                    e => e.completed && e.module && e.module.trackId === track.id && e.module.type === 'QUIZ'
                ).length;

                return {
                    id: track.id,
                    name: track.name,
                    progress,
                    quizCompleted,
                    quizTotal
                };
            });

            const globalProgress =
                totalModulesGlobal > 0 ? Math.round((totalCompletedGlobal / totalModulesGlobal) * 100) : 0;

            const totalQuizTotal = trackProgressDetails.reduce((acc, t) => acc + t.quizTotal, 0);
            const totalQuizCompleted = trackProgressDetails.reduce((acc, t) => acc + t.quizCompleted, 0);

            return {
                id: emp.id,
                name: `${emp.firstName} ${emp.lastName}`,
                firstName: emp.firstName,
                lastName: emp.lastName,
                email: emp.email,
                role: emp.role,
                department: emp.department || 'Other',
                tracks: trackProgressDetails,
                progress: globalProgress,
                quizCompleted: totalQuizCompleted,
                quizTotal: totalQuizTotal,
                status: globalProgress >= 100 ? 'CERTIFIED' : 'IN_PROGRESS'
            };
        });

        // 1. Calculate stats (Still based on all valid learners in the system)
        const allLearners = allData.filter(emp => emp.role === 'LEARNER' && emp.tracks.length > 0);
        const stats = {
            totalLearners: allLearners.length,
            avgProgression:
                allLearners.length > 0
                    ? Math.round(allLearners.reduce((acc, curr) => acc + curr.progress, 0) / allLearners.length)
                    : 0,
            avgPassRate: 0
        };

        const learnedWithQuizzes = allLearners.filter(l => l.quizTotal > 0);
        if (learnedWithQuizzes.length > 0) {
            stats.avgPassRate = Math.round(
                (learnedWithQuizzes.reduce((acc, curr) => acc + curr.quizCompleted / curr.quizTotal, 0) /
                    learnedWithQuizzes.length) *
                    100
            );
        }

        // 2. Apply filtering
        let filteredData = allData;
        if (search) {
            const s = search.toLowerCase();
            filteredData = filteredData.filter(
                emp => emp.name.toLowerCase().includes(s) || emp.email.toLowerCase().includes(s)
            );
        }
        if (trackId && trackId !== 'ALL') {
            filteredData = filteredData.filter(emp => emp.tracks.some(t => t.id === trackId));
        }

        // 3. Apply pagination
        const total = filteredData.length;
        const totalPages = Math.ceil(total / limitNum);
        const startIndex = (pageNum - 1) * limitNum;
        const paginatedData = filteredData.slice(startIndex, startIndex + limitNum);

        res.json({
            employees: paginatedData,
            stats,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages
            }
        });
    } catch (error) {
        console.error('Fetch employees error:', error);
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});

// GET /api/tracks - Get available tracks
router.get('/tracks', async (req, res) => {
    try {
        const tracks = await prisma.track.findMany();
        res.json({ tracks });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tracks' });
    }
});

// POST /api/users - Create a new employee (Admin only)
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { firstName, lastName, email, password, trackIds, role, department } = req.body;

        // Basic validation
        if (!firstName || !lastName || !email) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        const emailValidation = validateEmail(email);
        if (!emailValidation.isValid) {
            return res.status(400).json({ error: emailValidation.error });
        }

        const passwordToHash = password || 'Stitch2026!';
        const passwordValidation = validatePassword(passwordToHash);
        if (!passwordValidation.isValid) {
            return res.status(400).json({ error: passwordValidation.error });
        }
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(passwordToHash, salt);

        // Create the user
        const newUser = await prisma.user.create({
            data: {
                firstName,
                lastName,
                email,
                passwordHash,
                role: role || 'LEARNER',
                department: department || 'Other'
            }
        });

        // Step 2: Update tracks relationship via Raw SQL (avoid transactions)
        if (trackIds && Array.isArray(trackIds) && trackIds.length > 0) {
            try {
                for (const tId of trackIds) {
                    await prisma.$executeRaw`INSERT INTO "_TrackToUser" ("A", "B") VALUES (${tId}, ${newUser.id})`;
                }
            } catch (err) {
                console.error('Error connecting tracks on creation:', err);
            }
        }

        // --- NEW TRACK NOTIFICATION LOGIC ---
        if (newUser.role === 'LEARNER' && trackIds && trackIds.length > 0) {
            try {
                const tracks = await prisma.track.findMany({
                    where: { id: { in: trackIds }, status: 'PUBLISHED' }
                });

                if (tracks.length > 0) {
                    await prisma.notification.createMany({
                        data: tracks.map(t => ({
                            userId: newUser.id,
                            type: 'NEW_TRACK',
                            title: 'New Track Available!',
                            message: `🚀 A new track "${t.name}" is now available for you.`
                        }))
                    });
                }
            } catch (err) {
                console.error('Error creating user creation notifications:', err);
            }
        }
        // --- END NOTIFICATION LOGIC ---

        res.status(201).json({ user: newUser });
    } catch (error) {
        console.error('Create employee error:', error);
        res.status(500).json({ error: 'Failed to create employee' });
    }
});

// POST /api/users/bulk - Bulk create employees (Admin only)
router.post('/bulk', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { users } = req.body;

        if (!users || !Array.isArray(users)) {
            return res.status(400).json({ error: 'Users array is required' });
        }

        const results = {
            created: 0,
            failed: 0,
            errors: []
        };

        const salt = await bcrypt.genSalt(10);

        for (const user of users) {
            try {
                const { firstName, lastName, email, password, role, department } = user;

                // Basic validation
                if (!firstName || !lastName || !email) {
                    throw new Error(`Missing required fields for ${email || 'unknown user'}`);
                }

                // Check duplicate
                const existingUser = await prisma.user.findUnique({ where: { email } });
                if (existingUser) {
                    throw new Error(`User with email ${email} already exists`);
                }

                const emailValidation = validateEmail(email);
                if (!emailValidation.isValid) {
                    throw new Error(`${email}: ${emailValidation.error}`);
                }

                const passwordToHash = password || 'Stitch2026!#';
                const passwordValidation = validatePassword(passwordToHash);
                if (!passwordValidation.isValid) {
                    throw new Error(`${email}: ${passwordValidation.error}`);
                }
                const passwordHash = await bcrypt.hash(passwordToHash, salt);

                const newUser = await prisma.user.create({
                    data: {
                        firstName,
                        lastName,
                        email,
                        passwordHash,
                        role: role || 'LEARNER',
                        department: department || 'Other'
                    }
                });

                // --- NEW TRACK NOTIFICATION LOGIC ---
                // In bulk creation, if no trackIds are provided in the request body (which is often the case for CSV import),
                // we might want to check if any published tracks target this user's department.
                if (newUser.role === 'LEARNER') {
                    try {
                        const targetDepts = [newUser.department, 'All', 'Other'];
                        const tracks = await prisma.track.findMany({
                            where: {
                                status: 'PUBLISHED',
                                OR: targetDepts.map(dept => ({
                                    targetDepartments: { contains: dept }
                                }))
                            }
                        });

                        if (tracks.length > 0) {
                            await prisma.notification.createMany({
                                data: tracks.map(t => ({
                                    userId: newUser.id,
                                    type: 'NEW_TRACK',
                                    title: 'Welcome! New Tracks Available',
                                    message: `🚀 The track "${t.name}" is available for you.`
                                }))
                            });
                        }
                    } catch (err) {
                        console.error('Bulk user notification error:', err);
                    }
                }
                // --- END NOTIFICATION LOGIC ---

                results.created++;
            } catch (err) {
                results.failed++;
                results.errors.push(err.message);
            }
        }

        res.json(results);
    } catch (error) {
        console.error('Bulk create error:', error);
        res.status(500).json({ error: 'Failed to process bulk import' });
    }
});

// PUT /api/users/:id - Update an employee (Admin only)
router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
    const fs = require('fs');
    const logFile = 'server_debug.log';
    const log = msg => {
        try {
            fs.appendFileSync(logFile, `[${new Date().toISOString()}] UPDATE USER ${req.params.id}: ${msg}\n`);
        } catch (e) {}
        console.log(`[UPDATE USER ${req.params.id}]: ${msg}`);
    };

    try {
        const { id } = req.params;
        const { firstName, lastName, email, trackIds, role, department, password } = req.body;

        log(
            `Payload received: ${JSON.stringify({ firstName, lastName, email, role, department, trackIds, hasPassword: !!password })}`
        );

        // Basic validation for required fields
        if (!firstName || !lastName || !email) {
            log('Validation failed: Missing required fields');
            return res.status(400).json({ error: 'First name, last name, and email are required.' });
        }

        const emailVal = validateEmail(email);
        if (!emailVal.isValid) {
            log(`Validation failed: ${emailVal.error}`);
            return res.status(400).json({ error: emailVal.error });
        }

        let passwordHash = undefined;
        if (password && password.trim() !== '') {
            log('Hashing new password...');
            const passVal = validatePassword(password);
            if (!passVal.isValid) {
                log(`Validation failed: ${passVal.error}`);
                return res.status(400).json({ error: passVal.error });
            }
            const salt = await bcrypt.genSalt(10);
            passwordHash = await bcrypt.hash(password, salt);
        }

        const oldUser = await prisma.user.findUnique({
            where: { id },
            include: { tracks: { select: { id: true } } }
        });

        if (!oldUser) {
            log('Error: User not found in database');
            return res.status(404).json({ error: 'User not found' });
        }

        log('Executing database update...');
        let updatedUser;
        try {
            // Step 1: Update basic user info (Atomic/No transaction needed for single record)
            updatedUser = await prisma.user.update({
                where: { id },
                data: {
                    firstName,
                    lastName,
                    email,
                    role,
                    passwordHash,
                    department: department || null
                }
            });

            // Step 2: Update tracks relationship (Manual SQL to avoid Prisma's implicit transaction)
            if (trackIds && Array.isArray(trackIds)) {
                log(`Updating tracks manually for user ${id}...`);
                // Clear existing relations
                await prisma.$executeRaw`DELETE FROM "_TrackToUser" WHERE "B" = ${id}`;

                // Add new relations
                if (trackIds.length > 0) {
                    for (const tId of trackIds) {
                        await prisma.$executeRaw`INSERT INTO "_TrackToUser" ("A", "B") VALUES (${tId}, ${id})`;
                    }
                }
                log('Manual track update successful');
            }
        } catch (dbError) {
            log(`Database update failed: ${dbError.message} (Code: ${dbError.code})`);
            if (dbError.code === 'P2002') {
                return res.status(400).json({ error: 'Email already exists for another user.' });
            }
            if (dbError.code === 'P2025') {
                return res.status(404).json({ error: 'User not found.' });
            }
            throw dbError; // Rethrow to be caught by outer catch
        }

        // --- NEW TRACK NOTIFICATION LOGIC ---
        if (updatedUser.role === 'LEARNER' && trackIds && Array.isArray(trackIds)) {
            try {
                const oldTrackIds = oldUser.tracks.map(t => t.id);
                const newTrackIds = trackIds.filter(id => !oldTrackIds.includes(id));

                if (newTrackIds.length > 0) {
                    const tracks = await prisma.track.findMany({
                        where: { id: { in: newTrackIds }, status: 'PUBLISHED' }
                    });

                    if (tracks.length > 0) {
                        log(`Creating ${tracks.length} track assignment notifications...`);
                        await prisma.notification.createMany({
                            data: tracks.map(t => ({
                                userId: updatedUser.id,
                                type: 'NEW_TRACK',
                                title: 'New Track Assigned!',
                                message: `🚀 A new track "${t.name}" has been assigned to you.`
                            }))
                        });
                    }
                }
            } catch (err) {
                log(`Error creating update notifications (non-fatal): ${err.message}`);
                console.error('Error creating update notifications:', err);
            }
        }
        // --- END NOTIFICATION LOGIC ---

        log('Update successful');
        res.json({ user: updatedUser });
    } catch (error) {
        log(`CRITICAL ERROR during User Update: ${error.message} \nStack: ${error.stack}`);
        console.error('Update employee error:', error);
        res.status(500).json({
            error: 'Failed to update user',
            details: error.message,
            code: error.code
        });
    }
});

// DELETE /api/users/bulk - Bulk delete employees (Admin only)
router.delete('/bulk', verifyToken, verifyAdmin, async (req, res) => {
    const fs = require('fs');
    const logFile = 'server_debug.log';
    const log = msg => {
        try {
            fs.appendFileSync(logFile, `[${new Date().toISOString()}] BULK DELETE: ${msg}\n`);
        } catch (e) {}
        console.log(`[BULK DELETE]: ${msg}`);
    };

    try {
        const { ids } = req.body;
        const currentUserId = req.user.id;

        log(`Attempt by ${currentUserId} for IDs: ${ids ? ids.join(', ') : 'NONE'}`);

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'User IDs array is required and cannot be empty' });
        }

        // Prevent self-deletion in bulk
        const filteredIds = ids.filter(id => id !== currentUserId);

        if (filteredIds.length === 0) {
            return res.status(400).json({ error: 'You cannot delete yourself.' });
        }

        // Check if any of the target users are admins
        const adminsInSelection = await prisma.user.findMany({
            where: {
                id: { in: filteredIds },
                role: 'ADMIN'
            }
        });

        if (adminsInSelection.length > 0) {
            const adminNames = adminsInSelection.map(a => `${a.firstName} ${a.lastName}`).join(', ');
            return res.status(400).json({
                error: `Administrators cannot be deleted. Please change their role to Learner first. (Admin found: ${adminNames})`
            });
        }

        // Manual Cascade
        const enrollResult = await prisma.enrollment.deleteMany({
            where: { userId: { in: filteredIds } }
        });
        log(`Manual cascade: Deleted ${enrollResult.count} enrollments`);

        // Delete users
        const deleteResult = await prisma.user.deleteMany({
            where: { id: { in: filteredIds } }
        });

        log(`Successfully deleted ${deleteResult.count} users`);
        res.json({
            message: 'Employees deleted successfully',
            count: deleteResult.count,
            selfDeletedBlocked: filteredIds.length !== ids.length
        });
    } catch (error) {
        log(`ERROR: ${error.message}`);
        res.status(500).json({ error: `Server Error: ${error.message}` });
    }
});

// DELETE /api/users/:id - Delete an employee (Admin only)
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
    const fs = require('fs');
    const logFile = 'server_debug.log';
    const log = msg => {
        try {
            fs.appendFileSync(logFile, `[${new Date().toISOString()}] DELETE: ${msg}\n`);
        } catch (e) {}
        console.log(`[DELETE]: ${msg}`);
    };

    try {
        const { id } = req.params;
        const currentUserId = req.user.id;

        log(`Attempt for ID: ${id} by admin ${currentUserId}`);

        if (id === currentUserId) {
            return res.status(400).json({ error: 'You cannot delete yourself.' });
        }

        // Check user role
        const userToDelete = await prisma.user.findUnique({
            where: { id },
            select: { role: true, firstName: true, lastName: true }
        });

        if (!userToDelete) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (userToDelete.role === 'ADMIN') {
            return res
                .status(400)
                .json({ error: 'Administrators cannot be deleted. Please change their role to Learner first.' });
        }

        // Manual Cascade
        const enrollResult = await prisma.enrollment.deleteMany({
            where: { userId: id }
        });
        log(`Manual cascade: Deleted ${enrollResult.count} enrollments`);

        await prisma.user.delete({
            where: { id }
        });

        log(`Successfully deleted user ${id}`);
        res.json({ message: 'Employee deleted successfully (V2)' });
    } catch (error) {
        log(`ERROR for ${req.params.id}: ${error.message}`);
        res.status(500).json({ error: `Server Error: ${error.message}` });
    }
});

// PUT /api/users/profile - Update personal profile (Any logged in user)
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { firstName, lastName, email } = req.body;

        // Validation
        if (!firstName || !lastName || !email) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check for email duplicates if email is being changed
        if (email !== req.user.email) {
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                return res.status(400).json({ error: 'Email already in use by another account' });
            }
        }

        // Update user
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { firstName, lastName, email }
        });

        // Re-issue JWT with updated info
        const newToken = jwt.sign(
            {
                id: updatedUser.id,
                email: updatedUser.email,
                role: updatedUser.role,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                department: updatedUser.department
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Set HttpOnly cookie
        res.cookie('token', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                role: updatedUser.role,
                department: updatedUser.department
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// POST /api/users/track - Save the logged-in user's track selection
router.post('/track', verifyToken, async (req, res) => {
    try {
        const { trackId } = req.body;
        const userId = req.user.id;

        if (!trackId) {
            return res.status(400).json({ error: 'trackId is required' });
        }

        // Verify track exists
        const track = await prisma.track.findUnique({ where: { id: trackId } });
        if (!track) {
            return res.status(404).json({ error: 'Track not found' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                // No relation update here to avoid transaction
            },
            include: { tracks: true }
        });

        // Manual connect via Raw SQL
        await prisma.$executeRaw`INSERT INTO "_TrackToUser" ("A", "B") 
                                 SELECT ${trackId}, ${userId}
                                 WHERE NOT EXISTS (
                                     SELECT 1 FROM "_TrackToUser" WHERE "A" = ${trackId} AND "B" = ${userId}
                                 )`;

        res.json({ message: 'Track selection saved', trackId, trackName: track.name });
    } catch (error) {
        console.error('Save track error:', error);
        res.status(500).json({ error: 'Failed to save track selection' });
    }
});

module.exports = router;
