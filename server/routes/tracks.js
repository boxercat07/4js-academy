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
        let { name, description, icon, targetDepartments, status, curriculumDraft, language } = req.body;

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
                curriculumDraft
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
                    orderBy: { order: 'asc' }
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
        const { modules } = req.body;

        if (!modules || !Array.isArray(modules)) {
            return res.status(400).json({ error: 'modules array is required' });
        }

        const track = await prisma.track.findUnique({ where: { id } });
        if (!track) {
            return res.status(404).json({ error: 'Track not found' });
        }

        // Preserve progress by upserting based on title + trackId
        const existingModules = await prisma.module.findMany({ where: { trackId: id } });
        const existingTitles = existingModules.map(m => m.title);
        const publishedTitles = [];

        let orderIndex = 0;
        for (const mod of modules) {
            const items = mod.items || [];
            for (const item of items) {
                orderIndex++;
                const title = item.title || 'Untitled';
                publishedTitles.push(title);

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

                // Let's use finding and manual update/create
                const existing = existingModules.find(m => m.title === title);
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
                            mediaUrl
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

        // Cleanup: remove modules that were deleted by admin
        const titlesToDelete = existingTitles.filter(t => !publishedTitles.includes(t));
        if (titlesToDelete.length > 0) {
            // Fetch mediaUrls for orphaned modules before deletion
            const modulesToCleanup = await prisma.module.findMany({
                where: {
                    trackId: id,
                    title: { in: titlesToDelete }
                },
                select: { mediaUrl: true }
            });

            await prisma.module.deleteMany({
                where: {
                    trackId: id,
                    title: { in: titlesToDelete }
                }
            });

            // Cleanup files
            for (const mod of modulesToCleanup) {
                if (mod.mediaUrl) {
                    await deleteFileByUrl(mod.mediaUrl);
                }
            }
        }

        // Update track status to PUBLISHED
        const updatedTrack = await prisma.track.update({
            where: { id },
            data: {
                status: 'PUBLISHED',
                curriculumDraft: null // Clear draft on successful publish
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
