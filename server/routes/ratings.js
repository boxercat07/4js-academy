const express = require('express');
const prisma = require('../prisma');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/ratings/:trackId
 * Submit or update a rating for a track
 */
router.post('/:trackId', verifyToken, async (req, res) => {
    try {
        const { trackId } = req.params;
        const { stars, comment } = req.body;
        const userId = req.user.id;

        if (!stars || stars < 1 || stars > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5 stars' });
        }

        const rating = await prisma.rating.upsert({
            where: {
                userId_trackId: { userId, trackId }
            },
            update: {
                stars,
                comment,
                updatedAt: new Date()
            },
            create: {
                userId,
                trackId,
                stars,
                comment
            }
        });

        res.json(rating);
    } catch (error) {
        console.error('[RATINGS] Error submitting rating:', error);
        res.status(500).json({ error: 'Failed to submit rating' });
    }
});

/**
 * GET /api/admin/ratings/stats
 * Admin only: Get average ratings per track
 */
router.get('/admin/stats', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { trackId } = req.query;

        const where = trackId && trackId !== 'ALL' ? { id: trackId } : { status: 'PUBLISHED' };

        const tracks = await prisma.track.findMany({
            where,
            include: {
                ratings: {
                    select: { stars: true }
                }
            }
        });

        const stats = tracks
            .map(t => {
                const count = t.ratings.length;
                const avg = count > 0 ? t.ratings.reduce((acc, r) => acc + r.stars, 0) / count : 0;
                return {
                    id: t.id,
                    name: t.name,
                    averageRating: parseFloat(avg.toFixed(1)),
                    totalRatings: count
                };
            })
            .sort((a, b) => b.averageRating - a.averageRating);

        res.json(stats);
    } catch (error) {
        console.error('[RATINGS] Error fetching admin stats:', error);
        res.status(500).json({ error: 'Failed to fetch rating statistics' });
    }
});

/**
 * GET /api/ratings/:trackId/stats
 * Public: Get average rating and count for a specific track
 */
router.get('/:trackId/stats', verifyToken, async (req, res) => {
    try {
        const { trackId } = req.params;

        const [track, ratings] = await Promise.all([
            prisma.track.findUnique({
                where: { id: trackId },
                select: { id: true }
            }),
            prisma.rating.findMany({
                where: { trackId },
                select: { stars: true }
            })
        ]);

        if (!track) {
            return res.status(404).json({ error: 'Track not found' });
        }

        const count = ratings.length;
        const avg = count > 0 ? ratings.reduce((acc, r) => acc + r.stars, 0) / count : 0;

        res.json({
            id: track.id,
            averageRating: parseFloat(avg.toFixed(1)),
            totalRatings: count
        });
    } catch (error) {
        console.error('[RATINGS] Error fetching track stats:', error);
        res.status(500).json({ error: 'Failed to fetch rating statistics' });
    }
});

/**
 * GET /api/admin/ratings/details
 * Admin only: Get detailed list of employee ratings
 */
router.get('/admin/details', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { trackId, search } = req.query;

        const where = {
            user: { role: 'LEARNER' }
        };

        if (trackId && trackId !== 'ALL') {
            where.trackId = trackId;
        }

        if (search) {
            where.user = {
                ...where.user,
                OR: [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } }
                ]
            };
        }

        const ratings = await prisma.rating.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        department: true
                    }
                },
                track: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(ratings);
    } catch (error) {
        console.error('[RATINGS] Error fetching admin details:', error);
        res.status(500).json({ error: 'Failed to fetch rating details' });
    }
});

module.exports = router;
