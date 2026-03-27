const express = require('express');
const prisma = require('../prisma');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { sanitizeInput, validateLength } = require('../utils/validation');

const router = express.Router();

// GET /api/modules - List all modules (Admin sees all, Learner sees published and generic + their track)
router.get('/', verifyToken, async (req, res) => {
    try {
        let modules;
        if (req.user.role === 'ADMIN') {
            modules = await prisma.module.findMany({
                include: { track: true },
                orderBy: [{ trackId: 'asc' }, { order: 'asc' }]
            });
        } else {
            // Learner query (simplified for mockup structure)
            modules = await prisma.module.findMany({
                where: {
                    status: 'PUBLISHED'
                },
                include: { track: true },
                orderBy: { order: 'asc' }
            });
        }
        res.json({ modules });
    } catch (error) {
        console.error('Fetch modules error:', error);
        res.status(500).json({ error: 'Failed to fetch modules' });
    }
});

// POST /api/modules - Create a new module (Admin only)
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
    try {
        let { title, description, trackId, duration, type, mediaUrl, status, order } = req.body;

        // Sanitize
        title = sanitizeInput(title);
        description = sanitizeInput(description);

        // Validate
        const titleValid = validateLength(title, 'Module title', 3, 100);
        if (!titleValid.isValid) return res.status(400).json({ error: titleValid.error });

        const descValid = validateLength(description, 'Description', 3, 2000); // Modules require description
        if (!descValid.isValid) return res.status(400).json({ error: descValid.error });

        const ALLOWED_TYPES = ['PAGE', 'VIDEO', 'PDF', 'QUIZ', 'AUDIO', 'IMAGE', 'SLIDES', 'LINK'];
        if (!type || !ALLOWED_TYPES.includes(type.toUpperCase().replace(/-/g, '_'))) {
            return res.status(400).json({ error: `Invalid module type. Allowed: ${ALLOWED_TYPES.join(', ')}` });
        }
        const normalizedType = type.toUpperCase().replace(/-/g, '_');

        if (!trackId || !duration || !status) {
            return res.status(400).json({ error: 'Missing required configuration fields' });
        }

        if (mediaUrl) {
            try {
                const parsed = new URL(mediaUrl.trim());
                const SAFE_PROTOCOLS = ['http:', 'https:', 'blob:'];
                if (!SAFE_PROTOCOLS.includes(parsed.protocol)) {
                    return res
                        .status(400)
                        .json({ error: 'Invalid media URL: only http, https, or blob protocols are allowed' });
                }
            } catch {
                return res.status(400).json({ error: 'Invalid media URL format' });
            }
        }

        const newModule = await prisma.module.create({
            data: {
                title,
                description,
                trackId,
                duration: parseInt(duration),
                type: normalizedType,
                mediaUrl: mediaUrl || '',
                status,
                order: parseInt(order || 0)
            },
            include: { track: true }
        });

        res.status(201).json({ message: 'Module created successfully', module: newModule });
    } catch (error) {
        console.error('Create module error:', error);
        res.status(500).json({ error: 'Failed to create module' });
    }
});

module.exports = router;
