const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

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
        const { title, description, trackId, duration, type, mediaUrl, status, order } = req.body;

        if (!title || !description || !trackId || !duration || !type || !status) {
            return res.status(400).json({ error: 'Missing required configuration fields' });
        }

        const newModule = await prisma.module.create({
            data: {
                title,
                description,
                trackId,
                duration: parseInt(duration),
                type,
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
