const express = require('express');
const prisma = require('../prisma');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { deleteFileByUrl } = require('../utils/fileCleanup');
const { sanitizeInput, validateLength } = require('../utils/validation');

const isUuid = id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
const { auditLog } = require('../utils/auditLog');

const router = express.Router();

function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/[^\w\-]+/g, '') // Remove all non-word chars
        .replace(/\-\-+/g, '-'); // Replace multiple - with single -
}

// GET /api/tracks/public-stats - Public landing page stats (no auth)
router.get('/public-stats', async (req, res) => {
    try {
        const [learnerCount, learners, publishedTracks, completedEnrollments] = await Promise.all([
            prisma.user.count({ where: { role: 'LEARNER' } }),
            prisma.user.findMany({ where: { role: 'LEARNER' }, select: { department: true } }),
            prisma.track.findMany({
                where: { status: 'PUBLISHED' },
                select: {
                    id: true,
                    targetDepartments: true,
                    modules: { where: { status: 'PUBLISHED' }, select: { id: true } }
                }
            }),
            prisma.enrollment.findMany({
                where: { completed: true },
                select: {
                    userId: true,
                    moduleId: true,
                    lastScore: true,
                    module: { select: { type: true, trackId: true } }
                }
            })
        ]);

        // Dept coverage
        const uniqueDepts = [...new Set(learners.map(u => u.department).filter(Boolean))];
        const coveredDepts = new Set();
        for (const track of publishedTracks) {
            if (!track.targetDepartments) continue;
            for (const dept of track.targetDepartments.split(',').map(d => d.trim())) {
                if (uniqueDepts.includes(dept)) coveredDepts.add(dept);
            }
        }
        const deptCoverage = uniqueDepts.length > 0 ? Math.round((coveredDepts.size / uniqueDepts.length) * 100) : 0;

        // Skill points: 10 pts per completed module + floor(lastScore / 10) bonus for quizzes
        const totalSkillPoints = completedEnrollments.reduce((sum, e) => {
            let pts = 10;
            if (e.module?.type === 'QUIZ' && e.lastScore != null) {
                pts += Math.floor(e.lastScore / 10);
            }
            return sum + pts;
        }, 0);

        // Certifications: count (userId, trackId) pairs where user completed all published modules
        let totalCertifications = 0;
        for (const track of publishedTracks) {
            if (track.modules.length === 0) continue;
            const moduleIdSet = new Set(track.modules.map(m => m.id));
            const userCompletionCounts = new Map();
            for (const e of completedEnrollments) {
                if (!moduleIdSet.has(e.moduleId)) continue;
                userCompletionCounts.set(e.userId, (userCompletionCounts.get(e.userId) || 0) + 1);
            }
            for (const count of userCompletionCounts.values()) {
                if (count === moduleIdSet.size) totalCertifications++;
            }
        }

        res.json({ learnerCount, deptCoverage, totalSkillPoints, totalCertifications });
    } catch (error) {
        console.error('Public stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// GET /api/tracks - Get available tracks (with optional status filter)
router.get('/', verifyToken, async (req, res) => {
    try {
        const { status } = req.query;
        const where = {};
        if (status) {
            where.status = status;
        }

        const tracks = await prisma.track.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        res.json(tracks);
    } catch (error) {
        console.error('Error fetching tracks:', error);
        res.status(500).json({ error: 'Failed to fetch tracks' });
    }
});

// POST /api/tracks - Create a new track (Admin only)
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
    try {
        let { name, description, icon, targetDepartments, language } = req.body;

        // Sanitize
        name = sanitizeInput(name);
        description = sanitizeInput(description);

        // Validate
        const nameValid = validateLength(name, 'Track name', 3, 40);
        if (!nameValid.isValid) return res.status(400).json({ error: nameValid.error });

        const descValid = validateLength(description, 'Description', 0, 150);
        if (!descValid.isValid) return res.status(400).json({ error: descValid.error });

        const slug = slugify(name);

        // Check for duplicates
        const existing = await prisma.track.findFirst({
            where: {
                OR: [{ name: { equals: name } }, { slug: { equals: slug } }]
            }
        });

        if (existing) {
            return res.status(409).json({ error: 'A track with this name or URL already exists.' });
        }

        const track = await prisma.track.create({
            data: {
                name,
                slug,
                description: description || '',
                icon: icon || 'terminal',
                language: language || 'EN',
                targetDepartments: targetDepartments || 'Other',
                status: 'DRAFT'
            }
        });

        res.status(201).json(track);

        // Audit log
        auditLog(req.user.id, 'CREATE_TRACK', {
            resourceType: 'TRACK',
            resourceId: track.id,
            details: { name: track.name, slug: track.slug },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });
    } catch (error) {
        console.error('Track creation error:', error);
        res.status(500).json({ error: 'Failed to create track.' });
    }
});

// GET /api/tracks/slug/:slug - Get a single track by slug
router.get('/slug/:slug', verifyToken, async (req, res) => {
    try {
        const { slug } = req.params;
        const track = await prisma.track.findUnique({
            where: { slug },
            include: {
                ratings: true
            }
        });

        if (!track) {
            return res.status(404).json({ error: 'Track not found' });
        }

        const plainTrack = JSON.parse(JSON.stringify(track));
        const ratings = plainTrack.ratings || [];
        const count = ratings.length;
        const avg = count > 0 ? ratings.reduce((acc, r) => acc + r.stars, 0) / count : 0;

        delete plainTrack.ratings;

        res.json({
            ...plainTrack,
            averageRating: parseFloat(avg.toFixed(1)),
            ratingCount: count
        });
    } catch (error) {
        console.error('Error fetching track by slug:', error);
        res.status(500).json({ error: 'Failed to fetch track' });
    }
});

// GET /api/tracks/:id - Get a single track by ID
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const track = await prisma.track.findUnique({
            where: { id },
            include: {
                ratings: true
            }
        });

        if (!track) {
            return res.status(404).json({ error: 'Track not found' });
        }

        const plainTrack = JSON.parse(JSON.stringify(track));
        const ratings = plainTrack.ratings || [];
        const count = ratings.length;
        const avg = count > 0 ? ratings.reduce((acc, r) => acc + r.stars, 0) / count : 0;

        delete plainTrack.ratings;

        res.json({
            ...plainTrack,
            averageRating: parseFloat(avg.toFixed(1)),
            ratingCount: count
        });
    } catch (error) {
        console.error('Error fetching track:', error);
        res.status(500).json({ error: 'Failed to fetch track' });
    }
});

// PUT /api/tracks/:id - Update track metadata (Admin only)
router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        let {
            name,
            description,
            icon,
            targetDepartments,
            status,
            curriculumDraft,
            language,
            isCertifiable,
            certExpiryMonths,
            certScoreMin
        } = req.body;

        // Sanitize and validate if provided
        if (name !== undefined) {
            name = sanitizeInput(name);
            const nameValid = validateLength(name, 'Track name', 3, 40);
            if (!nameValid.isValid) return res.status(400).json({ error: nameValid.error });
        }

        if (description !== undefined) {
            description = sanitizeInput(description);
            const descValid = validateLength(description, 'Description', 0, 150);
            if (!descValid.isValid) return res.status(400).json({ error: descValid.error });
        }

        if (curriculumDraft) {
            try {
                JSON.parse(curriculumDraft);
            } catch (e) {
                console.warn('[TRACKS] Failed to parse curriculumDraft JSON');
            }
        }

        // Fetch current track to detect status transitions
        const currentTrack = await prisma.track.findUnique({ where: { id }, select: { status: true } });
        if (!currentTrack) {
            return res.status(404).json({ error: 'Track not found' });
        }

        // If name is changing, check for uniqueness and update slug
        let slug;
        if (name) {
            slug = slugify(name);
            const duplicate = await prisma.track.findFirst({
                where: {
                    AND: [{ id: { not: id } }, { OR: [{ name }, { slug }] }]
                }
            });
            if (duplicate) {
                return res.status(409).json({ error: 'A track with this name or URL already exists.' });
            }
        }

        const updateData = Object.fromEntries(
            Object.entries({
                name,
                slug,
                description,
                icon,
                language,
                targetDepartments,
                status,
                curriculumDraft,
                isCertifiable: isCertifiable !== undefined ? Boolean(isCertifiable) : undefined,
                certExpiryMonths:
                    certExpiryMonths !== undefined
                        ? certExpiryMonths === null
                            ? null
                            : parseInt(certExpiryMonths)
                        : undefined,
                certScoreMin:
                    certScoreMin !== undefined ? (certScoreMin === null ? null : parseInt(certScoreMin)) : undefined
            }).filter(([, v]) => v !== undefined)
        );

        const track = await prisma.track.update({
            where: { id },
            data: updateData
        });
        console.log(`[TRACKS] Track ${id} updated successfully in DB.`);

        // Notify learners when a track transitions to PUBLISHED
        if (status === 'PUBLISHED' && currentTrack.status !== 'PUBLISHED') {
            try {
                const targetDepts = track.targetDepartments
                    ? track.targetDepartments.split(',').map(d => d.trim())
                    : [];
                const isGlobal =
                    targetDepts.length === 0 ||
                    targetDepts.some(d => d.toLowerCase() === 'all' || d.toLowerCase() === 'other');

                let userWhere;
                if (isGlobal) {
                    userWhere = { role: 'LEARNER' };
                } else {
                    userWhere = {
                        role: 'LEARNER',
                        OR: [{ tracks: { some: { id: track.id } } }, { department: { in: targetDepts } }]
                    };
                }

                const usersToNotify = await prisma.user.findMany({
                    where: userWhere,
                    select: { id: true }
                });

                if (usersToNotify.length > 0) {
                    await prisma.notification.createMany({
                        data: usersToNotify.map(u => ({
                            userId: u.id,
                            type: 'NEW_TRACK',
                            title: 'New Track Available!',
                            message: `🚀 A new track "${track.name}" is now available for you.`
                        }))
                    });
                    console.log(
                        `[Notifications] Sent NEW_TRACK to ${usersToNotify.length} learner(s) for "${track.name}" (via PUT)`
                    );
                }
            } catch (notifError) {
                console.error('Error creating publication notifications (PUT):', notifError);
            }
        }

        // Cert reconciliation: runs whenever cert settings are explicitly included in the payload
        if (isCertifiable !== undefined) {
            try {
                if (!track.isCertifiable) {
                    // Track no longer certifiable — revoke all ACTIVE certs
                    const activeCerts = await prisma.certificate.findMany({
                        where: { trackId: id, status: 'ACTIVE' }
                    });
                    for (const cert of activeCerts) {
                        await prisma.certificate.update({ where: { id: cert.id }, data: { status: 'REVOKED' } });
                        await prisma.notification.create({
                            data: {
                                userId: cert.userId,
                                type: 'CERT_REVOKED',
                                title: 'Certification Revoked',
                                message: `Your "${track.name}" certification (${cert.code}) has been revoked because this track no longer awards certifications.`
                            }
                        });
                    }
                } else {
                    // Re-evaluate every enrolled learner
                    const publishedModules = await prisma.module.findMany({
                        where: { trackId: id, status: 'PUBLISHED' }
                    });
                    const totalModules = publishedModules.length;
                    if (totalModules > 0) {
                        const moduleIds = publishedModules.map(m => m.id);
                        const quizModuleIds = publishedModules.filter(m => m.type === 'QUIZ').map(m => m.id);
                        const enrolledLearners = await prisma.user.findMany({
                            where: { role: 'LEARNER', tracks: { some: { id } } },
                            select: { id: true }
                        });

                        for (const learner of enrolledLearners) {
                            const completedCount = await prisma.enrollment.count({
                                where: { userId: learner.id, moduleId: { in: moduleIds }, completed: true }
                            });
                            const atFullCompletion = completedCount >= totalModules;

                            let meetsScore = true;
                            if (atFullCompletion && track.certScoreMin != null && quizModuleIds.length > 0) {
                                const quizEnrollments = await prisma.enrollment.findMany({
                                    where: { userId: learner.id, moduleId: { in: quizModuleIds }, completed: true },
                                    select: { lastScore: true }
                                });
                                if (quizEnrollments.length === 0) {
                                    meetsScore = false;
                                } else {
                                    const avg =
                                        quizEnrollments.reduce((s, e) => s + e.lastScore, 0) / quizEnrollments.length;
                                    meetsScore = avg >= track.certScoreMin;
                                }
                            }

                            const existing = await prisma.certificate.findUnique({
                                where: { userId_trackId: { userId: learner.id, trackId: id } }
                            });

                            if (atFullCompletion && meetsScore) {
                                if (!existing) {
                                    // New cert
                                    const code = 'CERT-' + Math.random().toString(36).substring(2, 8).toUpperCase();
                                    const expiresAt = track.certExpiryMonths
                                        ? new Date(Date.now() + track.certExpiryMonths * 30 * 24 * 60 * 60 * 1000)
                                        : null;
                                    await prisma.certificate.create({
                                        data: { code, userId: learner.id, trackId: id, expiresAt, status: 'ACTIVE' }
                                    });
                                    await prisma.notification.create({
                                        data: {
                                            userId: learner.id,
                                            type: 'CERT_EARNED',
                                            title: 'Certification Awarded',
                                            message: `Congratulations! You've been awarded the "${track.name}" certification.`
                                        }
                                    });
                                } else if (existing.status === 'EXPIRED') {
                                    // Renew expired cert
                                    const code = 'CERT-' + Math.random().toString(36).substring(2, 8).toUpperCase();
                                    const expiresAt = track.certExpiryMonths
                                        ? new Date(Date.now() + track.certExpiryMonths * 30 * 24 * 60 * 60 * 1000)
                                        : null;
                                    await prisma.certificate.update({
                                        where: { id: existing.id },
                                        data: { code, issuedAt: new Date(), expiresAt, status: 'ACTIVE' }
                                    });
                                    await prisma.notification.create({
                                        data: {
                                            userId: learner.id,
                                            type: 'CERT_EARNED',
                                            title: 'Certification Renewed',
                                            message: `Your "${track.name}" certification has been renewed.`
                                        }
                                    });
                                } else if (existing.status === 'ACTIVE' && certExpiryMonths !== undefined) {
                                    // Update expiry date (computed from original issuedAt)
                                    const expiresAt = track.certExpiryMonths
                                        ? new Date(
                                              existing.issuedAt.getTime() +
                                                  track.certExpiryMonths * 30 * 24 * 60 * 60 * 1000
                                          )
                                        : null;
                                    await prisma.certificate.update({
                                        where: { id: existing.id },
                                        data: { expiresAt }
                                    });
                                }
                                // REVOKED: admin deliberately revoked — no action
                            } else if (existing && existing.status === 'ACTIVE') {
                                // Learner no longer qualifies — revoke
                                await prisma.certificate.update({
                                    where: { id: existing.id },
                                    data: { status: 'REVOKED' }
                                });
                                const reason = !atFullCompletion
                                    ? 'the track requirements have changed'
                                    : 'you no longer meet the minimum score requirement';
                                await prisma.notification.create({
                                    data: {
                                        userId: learner.id,
                                        type: 'CERT_REVOKED',
                                        title: 'Certification Revoked',
                                        message: `Your "${track.name}" certification (${existing.code}) has been revoked because ${reason}.`
                                    }
                                });
                            }
                        }
                    }
                }
            } catch (certErr) {
                console.error('[TRACKS] Cert reconciliation error:', certErr);
            }
        }

        res.json(track);
    } catch (error) {
        console.error('Track update error:', error);
        res.status(500).json({ error: 'Failed to update track.' });
    }
});

// DELETE /api/tracks/:id - Delete a track (Admin only)
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[Backend] Attempting to delete track: ${id}`);

        // Check track status before deletion
        const track = await prisma.track.findUnique({
            where: { id },
            select: { status: true }
        });

        if (!track) {
            return res.status(404).json({ error: 'Track not found' });
        }

        if (track.status === 'PUBLISHED') {
            return res
                .status(400)
                .json({ error: 'Cannot delete a published track. Please unpublish (set to DRAFT) it first.' });
        }

        // First, fetch all modules to collect their mediaUrls for cleanup
        const modulesToDelete = await prisma.module.findMany({
            where: { trackId: id },
            select: { mediaUrl: true }
        });

        // Delete all modules associated with this track from DB
        await prisma.module.deleteMany({
            where: { trackId: id }
        });

        // Cleanup physical files after DB deletion
        for (const mod of modulesToDelete) {
            if (mod.mediaUrl) {
                await deleteFileByUrl(mod.mediaUrl);
            }
        }

        // Delete the track - join table entries are handled automatically by Prisma
        await prisma.track.delete({
            where: { id }
        });

        res.json({ message: 'Track and its modules deleted successfully' });

        // Audit log
        auditLog(req.user.id, 'DELETE_TRACK', {
            resourceType: 'TRACK',
            resourceId: id,
            details: { trackId: id },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });
    } catch (error) {
        console.error('Error deleting track:', error);
        res.status(500).json({ error: 'Failed to delete track.' });
    }
});

// GET /api/tracks/:id/modules - Get published modules for a specific track (for learners)
router.get('/:id/modules', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        const track = await prisma.track.findUnique({
            where: { id },
            include: {
                modules: {
                    where: req.user.role === 'ADMIN' ? {} : { status: 'PUBLISHED' },
                    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
                }
            }
        });

        if (!track) {
            return res.status(404).json({ error: 'Track not found' });
        }

        res.json({ track, modules: track.modules });
    } catch (error) {
        console.error('Error fetching track modules:', error);
        res.status(500).json({ error: 'Failed to fetch track modules' });
    }
});

// POST /api/tracks/:id/publish - Publish a track's curriculum (Admin only)
// Expects: { modules: [ { title, step, items: [ { title, type, icon, color, blobUrl, subtype, videoId } ] } ] }
router.post('/:id/publish', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { modules, curriculumDraft } = req.body;

        if (!modules || !Array.isArray(modules)) {
            return res.status(400).json({ error: 'modules array is required' });
        }

        const track = await prisma.track.findUnique({ where: { id } });
        if (!track) {
            return res.status(404).json({ error: 'Track not found' });
        }

        // Preserve progress by upserting based on title + trackId
        const existingModules = await prisma.module.findMany({ where: { trackId: id } });
        // Track consumed IDs to handle duplicate titles correctly (each DB record matched at most once)
        const consumedIds = new Set();

        let orderIndex = 0;
        for (const mod of modules) {
            const items = mod.items || [];
            for (const item of items) {
                orderIndex++;
                const title = item.title || 'Untitled';

                const type = (item.type || 'DOCUMENT').toUpperCase().replace(/-/g, '_');
                const blobUrl = item['blob-url'] || item.blobUrl || '';
                const fileId = item['file-id'] || item.fileId || '';

                // Prioritize permanent URLs (relative or external) over local file IDs
                let mediaUrl = '';
                if (blobUrl && !blobUrl.startsWith('blob:') && blobUrl !== '#') {
                    mediaUrl = blobUrl;
                } else if (fileId) {
                    if (!isUuid(fileId)) {
                        console.warn(`[Publish] Skipping invalid fileId (not a UUID): ${fileId}`);
                    } else {
                        mediaUrl = `local:${fileId}${item['success-threshold'] ? `|${item['success-threshold']}` : ''}`;
                    }
                } else {
                    mediaUrl = item['video-id'] || blobUrl || '';
                }

                // Match each DB record at most once so duplicate titles don't clobber each other
                const existing = existingModules.find(m => m.title === title && !consumedIds.has(m.id));
                if (existing) consumedIds.add(existing.id);
                if (existing) {
                    // Cleanup old file if it changed
                    if (existing.mediaUrl && existing.mediaUrl !== mediaUrl) {
                        await deleteFileByUrl(existing.mediaUrl);
                    }
                    await prisma.module.update({
                        where: { id: existing.id },
                        data: {
                            description: mod.title || 'Module',
                            order: orderIndex,
                            type,
                            mediaUrl,
                            status: 'PUBLISHED'
                        }
                    });
                } else {
                    await prisma.module.create({
                        data: {
                            title,
                            description: mod.title || 'Module',
                            trackId: id,
                            duration: 30,
                            type,
                            mediaUrl,
                            status: 'PUBLISHED',
                            order: orderIndex
                        }
                    });
                }
            }
        }

        // Cleanup: delete every pre-existing module that wasn't matched during this publish
        // (covers removed items AND stale duplicates left by consumedIds logic)
        const unconsumed = existingModules.filter(m => !consumedIds.has(m.id));
        if (unconsumed.length > 0) {
            await prisma.module.deleteMany({
                where: { id: { in: unconsumed.map(m => m.id) } }
            });
            for (const mod of unconsumed) {
                if (mod.mediaUrl) await deleteFileByUrl(mod.mediaUrl);
            }
        }

        // Update track status to PUBLISHED — clear curriculumDraft so the badge shows "Published" (not "Unpublished Changes")
        const updatedTrack = await prisma.track.update({
            where: { id },
            data: {
                status: 'PUBLISHED',
                curriculumDraft: null
            }
        });

        // --- NEW TRACK NOTIFICATION LOGIC ---
        // Notify users when a track is published
        try {
            const targetDepts = updatedTrack.targetDepartments
                ? updatedTrack.targetDepartments.split(',').map(d => d.trim())
                : [];
            const isGlobal =
                targetDepts.length === 0 ||
                targetDepts.some(d => d.toLowerCase() === 'all' || d.toLowerCase() === 'other');

            // Build user query based on scope
            let userWhere;
            if (isGlobal) {
                // All learners should be notified
                userWhere = { role: 'LEARNER' };
            } else {
                // Only learners in target departments or explicitly assigned
                userWhere = {
                    role: 'LEARNER',
                    OR: [{ tracks: { some: { id: updatedTrack.id } } }, { department: { in: targetDepts } }]
                };
            }

            const usersToNotify = await prisma.user.findMany({
                where: userWhere,
                select: { id: true }
            });

            if (usersToNotify.length > 0) {
                const notificationData = usersToNotify.map(u => ({
                    userId: u.id,
                    type: 'NEW_TRACK',
                    title: 'New Track Available!',
                    message: `🚀 A new track "${updatedTrack.name}" is now available for you.`
                }));

                await prisma.notification.createMany({
                    data: notificationData
                });
                console.log(
                    `[Notifications] Sent NEW_TRACK to ${usersToNotify.length} learner(s) for "${updatedTrack.name}"`
                );
            }
        } catch (notifError) {
            console.error('Error creating publication notifications:', notifError);
            // Don't fail the entire publish request if notifications fail
        }
        // --- END NOTIFICATION LOGIC ---

        res.json({ message: `Track published successfully with ${orderIndex} item(s).` });
    } catch (error) {
        console.error('Publish track error:', error);
        res.status(500).json({ error: 'Failed to publish track' });
    }
});

module.exports = router;
