const express = require('express');
const prisma = require('../prisma');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications - Get recent notifications for the logged-in user
router.get('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        const unreadCount = await prisma.notification.count({
            where: { userId, read: false }
        });

        res.json({ notifications, unreadCount });
    } catch (error) {
        console.error('Fetch notifications error:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// PATCH /api/notifications/:id/read - Mark a notification as read
router.patch('/:id/read', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const result = await prisma.notification.updateMany({
            where: { id, userId },
            data: { read: true }
        });

        if (result.count === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Update notification error:', error);
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

// PATCH /api/notifications/read-all - Mark all notifications as read
router.patch('/read-all', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;

        await prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true }
        });

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({ error: 'Failed' });
    }
});

// DELETE /api/notifications/:id - Delete a specific notification
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        await prisma.notification.deleteMany({
            where: { id, userId }
        });

        res.json({ message: 'Notification deleted' });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});

module.exports = router;
