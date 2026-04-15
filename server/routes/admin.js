const express = require('express');
const prisma = require('../prisma');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/admin/analytics - Global analytics for the dashboard
router.get('/analytics', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { period } = req.query;
        let startDate = null;

        if (period && period !== 'all') {
            if (!/^\d+$/.test(period)) {
                return res.status(400).json({ error: 'Invalid period: must be a positive integer.' });
            }
            const days = Math.min(parseInt(period, 10), 365);
            startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
        }

        const dateFilter = startDate ? { updatedAt: { gte: startDate } } : {};

        // 1. Stats Overview
        const totalUsers = await prisma.user.count({
            where: {
                role: 'LEARNER',
                tracks: { some: { status: 'PUBLISHED' } }
            }
        });

        // 2. Track Comparison
        const tracks = await prisma.track.findMany({
            where: { status: 'PUBLISHED' },
            include: {
                modules: { where: { status: 'PUBLISHED' } },
                users: {
                    where: { role: 'LEARNER' },
                    include: {
                        enrollments: {
                            where: { completed: true, ...dateFilter }
                        }
                    }
                }
            }
        });

        const trackComparison = tracks
            .map(track => {
                const totalModules = track.modules.length;
                const trackModuleIds = new Set(track.modules.map(m => m.id));

                const userProgressions = track.users.map(user => {
                    const userCompleted = user.enrollments.filter(e => trackModuleIds.has(e.moduleId)).length;
                    return totalModules > 0 ? (Math.min(userCompleted, totalModules) / totalModules) * 100 : 0;
                });

                const avgProgress =
                    userProgressions.length > 0
                        ? userProgressions.reduce((a, b) => a + b, 0) / userProgressions.length
                        : 0;

                return {
                    name: track.name,
                    avgProgress: Math.round(avgProgress)
                };
            })
            .sort((a, b) => b.avgProgress - a.avgProgress);

        // 3. Recent Activity - Milestones
        const recentCompletions = await prisma.enrollment.findMany({
            take: 100,
            where: {
                completed: true,
                ...dateFilter,
                user: {
                    role: 'LEARNER',
                    tracks: { some: { status: 'PUBLISHED' } }
                },
                module: {
                    track: { status: 'PUBLISHED' }
                }
            },
            orderBy: { updatedAt: 'desc' },
            include: {
                user: { include: { tracks: true } },
                module: { include: { track: { include: { modules: { where: { status: 'PUBLISHED' } } } } } }
            }
        });

        const userMilestones = new Set();
        const activity = [];

        for (const e of recentCompletions) {
            if (activity.length >= 20) break;

            const track = e.module.track;
            if (!track) continue;

            const totalModules = track.modules.length;
            if (totalModules === 0) continue;

            const trackModuleIds = track.modules.map(m => m.id);
            const completionsInTrack = await prisma.enrollment.count({
                where: {
                    userId: e.userId,
                    completed: true,
                    moduleId: { in: trackModuleIds }
                }
            });

            const progress = Math.round((completionsInTrack / totalModules) * 100);
            const prevProgress = Math.round(((completionsInTrack - 1) / totalModules) * 100);

            let milestone = null;
            if (prevProgress < 50 && progress >= 50) milestone = 50;
            else if (prevProgress < 75 && progress >= 75) milestone = 75;
            else if (prevProgress < 100 && progress >= 100) milestone = 100;

            if (milestone && !userMilestones.has(`${e.userId}-${milestone}`)) {
                userMilestones.add(`${e.userId}-${milestone}`);
                activity.push({
                    id: `${e.id}-${milestone}`,
                    userName: `${e.user.firstName} ${e.user.lastName}`,
                    userInitials: `${e.user.firstName[0]}${e.user.lastName[0]}`.toUpperCase(),
                    trackName: track.name,
                    milestone: milestone,
                    type: 'MILESTONE',
                    timestamp: e.updatedAt
                });
            }
        }

        // 4. Quiz Distribution
        let totalPassedRaw = 0;
        let totalPendingRaw = 0;
        let totalNotStartedRaw = 0;
        let totalRetakeRaw = 0;
        let totalAssignedQuizzes = 0;

        const learners = await prisma.user.findMany({
            where: {
                role: 'LEARNER',
                tracks: { some: { status: 'PUBLISHED' } }
            },
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
            }
        });

        learners.forEach(learner => {
            learner.tracks.forEach(track => {
                // Group modules by description (UI Group)
                const groups = {};
                track.modules.forEach(m => {
                    const groupTitle = m.description || 'General';
                    if (!groups[groupTitle]) groups[groupTitle] = [];
                    groups[groupTitle].push(m);
                });

                for (const [title, modules] of Object.entries(groups)) {
                    const quiz = modules.find(m => m.type === 'QUIZ');
                    if (!quiz) continue;

                    totalAssignedQuizzes++;

                    const quizEnrollment = learner.enrollments.find(e => e.moduleId === quiz.id);
                    const isPassed = quizEnrollment && quizEnrollment.completed;

                    if (isPassed) {
                        totalPassedRaw++;
                        continue;
                    }

                    // Not passed. Check if it's a retake (at least one attempt)
                    const hasAttempted = quizEnrollment && (quizEnrollment.attempts > 0 || quizEnrollment.progress > 0);
                    if (hasAttempted) {
                        totalRetakeRaw++;
                        continue;
                    }

                    // Not attempted. Check if group is started
                    const others = modules.filter(m => m.id !== quiz.id);
                    const isStarted = others.some(m => {
                        const e = learner.enrollments.find(en => en.moduleId === m.id);
                        return e && e.completed;
                    });

                    if (isStarted) {
                        totalPendingRaw++;
                    } else {
                        totalNotStartedRaw++;
                    }
                }
            });
        });

        const quizStats = {
            total: totalAssignedQuizzes,
            passedRatio: totalAssignedQuizzes > 0 ? Math.round((totalPassedRaw / totalAssignedQuizzes) * 100) : 0,
            pendingRatio: totalAssignedQuizzes > 0 ? Math.round((totalPendingRaw / totalAssignedQuizzes) * 100) : 0,
            notStartedRatio:
                totalAssignedQuizzes > 0 ? Math.round((totalNotStartedRaw / totalAssignedQuizzes) * 100) : 0,
            retakeRatio: totalAssignedQuizzes > 0 ? Math.round((totalRetakeRaw / totalAssignedQuizzes) * 100) : 0,
            passedRaw: totalPassedRaw,
            pendingRaw: totalPendingRaw,
            notStartedRaw: totalNotStartedRaw,
            retakeRaw: totalRetakeRaw
        };

        // 5. Top Performing Modules
        const modules = await prisma.module.findMany({
            where: {
                status: 'PUBLISHED',
                track: { status: 'PUBLISHED' }
            },
            include: {
                enrollments: {
                    where: dateFilter
                },
                track: true
            }
        });

        const topModules = modules
            .map(m => {
                const enrollments = m.enrollments;
                const completed = enrollments.filter(e => e.completed).length;
                const enrolled = enrollments.length;
                const trackName = m.track ? m.track.name : 'Unassigned';

                return {
                    id: m.id,
                    title: m.title,
                    track: trackName,
                    enrolled: enrolled,
                    rate: enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0,
                    completed: completed
                };
            })
            .filter(m => m.enrolled > 0)
            .sort((a, b) => b.enrolled - a.enrolled || b.completed - a.completed);

        // 6. Department Distribution
        const usersByDept = await prisma.user.groupBy({
            by: ['department'],
            where: {
                role: 'LEARNER',
                tracks: { some: { status: 'PUBLISHED' } }
            },
            _count: { _all: true }
        });
        const deptDistribution = usersByDept.map(d => ({
            name: d.department || 'Unassigned',
            count: d._count._all
        }));

        res.json({
            stats: {
                totalLearners: totalUsers
            },
            trackComparison,
            activity,
            quizStats,
            topModules: topModules.slice(0, 50),
            deptDistribution
        });
    } catch (error) {
        console.error('Admin analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// ====================================================================
// AUDIT LOG ENDPOINTS
// ====================================================================

/**
 * GET /api/admin/audit-logs
 * Retrieve audit logs (admin only)
 */
router.get('/audit-logs', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const rawDays = req.query.days;
        const rawLimit = req.query.limit;
        if (rawDays !== undefined && !/^\d+$/.test(rawDays)) {
            return res.status(400).json({ error: 'Invalid days: must be a positive integer.' });
        }
        if (rawLimit !== undefined && !/^\d+$/.test(rawLimit)) {
            return res.status(400).json({ error: 'Invalid limit: must be a positive integer.' });
        }
        const days = Math.min(parseInt(rawDays, 10) || 30, 365);
        const limit = Math.min(parseInt(rawLimit, 10) || 100, 200);
        const { action, userId, status } = req.query;

        const since = new Date();
        since.setDate(since.getDate() - days);

        const where = { createdAt: { gte: since } };
        if (action) where.action = action.toUpperCase();
        if (userId) where.userId = userId;
        if (status) where.status = status.toUpperCase();

        const logs = await prisma.auditLog.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        role: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit
        });

        res.json({
            count: logs.length,
            days,
            filters: { action, userId, status },
            logs
        });
    } catch (error) {
        console.error('[ADMIN] Audit logs fetch error:', error);
        res.status(500).json({ error: 'Failed to retrieve audit logs' });
    }
});

/**
 * GET /api/admin/audit-logs/user/:userId
 * Get audit history for specific user
 */
router.get('/audit-logs/user/:userId', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const rawLimit2 = req.query.limit;
        if (rawLimit2 !== undefined && !/^\d+$/.test(rawLimit2)) {
            return res.status(400).json({ error: 'Invalid limit: must be a positive integer.' });
        }
        const limit = Math.min(parseInt(rawLimit2, 10) || 50, 200);

        const logs = await prisma.auditLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit
        });

        res.json({ userId, count: logs.length, logs });
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve user history' });
    }
});

/**
 * GET /api/admin/audit-logs/statistics
 * Get audit log statistics
 */
router.get('/audit-logs/statistics', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const rawDays2 = req.query.days;
        if (rawDays2 !== undefined && !/^\d+$/.test(rawDays2)) {
            return res.status(400).json({ error: 'Invalid days: must be a positive integer.' });
        }
        const days = Math.min(parseInt(rawDays2, 10) || 30, 365);
        const since = new Date();
        since.setDate(since.getDate() - days);

        const byAction = await prisma.auditLog.groupBy({
            by: ['action'],
            where: { createdAt: { gte: since } },
            _count: true
        });

        const byStatus = await prisma.auditLog.groupBy({
            by: ['status'],
            where: { createdAt: { gte: since } },
            _count: true
        });

        const totalLogs = await prisma.auditLog.count({
            where: { createdAt: { gte: since } }
        });

        res.json({ days, totalLogs, byAction, byStatus });
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve statistics' });
    }
});

// ====================================================================
// CERTIFICATE ENDPOINTS
// ====================================================================

// PATCH /api/admin/certificates/:id/revoke - Revoke a certificate (Admin only)
router.patch('/certificates/:id/revoke', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const cert = await prisma.certificate.findUnique({ where: { id } });
        if (!cert) return res.status(404).json({ error: 'Certificate not found' });
        if (cert.status === 'REVOKED') return res.status(400).json({ error: 'Certificate already revoked' });

        const updated = await prisma.certificate.update({
            where: { id },
            data: { status: 'REVOKED' },
            include: { track: { select: { name: true } }, user: { select: { firstName: true, lastName: true } } }
        });

        await prisma.notification.create({
            data: {
                userId: cert.userId,
                type: 'CERT_REVOKED',
                title: 'Certification Revoked',
                message: `Your "${updated.track.name}" certification (${cert.code}) has been revoked by an administrator.`
            }
        });

        res.json({ message: 'Certificate revoked', certificate: updated });
    } catch (error) {
        console.error('Certificate revocation error:', error);
        res.status(500).json({ error: 'Failed to revoke certificate' });
    }
});

// POST /api/admin/certs/reconcile - Reconcile certifications for all learners across all certifiable tracks
router.post('/certs/reconcile', verifyToken, verifyAdmin, async (req, res) => {
    const summary = { issued: 0, renewed: 0, revoked: 0, updated: 0, tracksProcessed: 0 };
    try {
        const certifiableTracks = await prisma.track.findMany({
            where: { isCertifiable: true, status: 'PUBLISHED' },
            include: { modules: { where: { status: 'PUBLISHED' } } }
        });

        for (const track of certifiableTracks) {
            const totalModules = track.modules.length;
            if (totalModules === 0) continue;

            const moduleIds = track.modules.map(m => m.id);
            const quizModuleIds = track.modules.filter(m => m.type === 'QUIZ').map(m => m.id);

            const enrolledLearners = await prisma.user.findMany({
                where: { role: 'LEARNER', tracks: { some: { id: track.id } } },
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
                        const avg = quizEnrollments.reduce((s, e) => s + e.lastScore, 0) / quizEnrollments.length;
                        meetsScore = avg >= track.certScoreMin;
                    }
                }

                const existing = await prisma.certificate.findUnique({
                    where: { userId_trackId: { userId: learner.id, trackId: track.id } }
                });

                if (atFullCompletion && meetsScore) {
                    if (!existing) {
                        const code = 'CERT-' + Math.random().toString(36).substring(2, 8).toUpperCase();
                        const expiresAt = track.certExpiryMonths
                            ? new Date(Date.now() + track.certExpiryMonths * 30 * 24 * 60 * 60 * 1000)
                            : null;
                        await prisma.certificate.create({
                            data: { code, userId: learner.id, trackId: track.id, expiresAt, status: 'ACTIVE' }
                        });
                        await prisma.notification.create({
                            data: {
                                userId: learner.id,
                                type: 'CERT_EARNED',
                                title: 'Certification Awarded',
                                message: `Congratulations! You've been awarded the "${track.name}" certification.`
                            }
                        });
                        summary.issued++;
                    } else if (existing.status === 'EXPIRED') {
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
                        summary.renewed++;
                    } else if (existing.status === 'ACTIVE' && track.certExpiryMonths != null) {
                        const expiresAt = new Date(
                            existing.issuedAt.getTime() + track.certExpiryMonths * 30 * 24 * 60 * 60 * 1000
                        );
                        if (!existing.expiresAt || Math.abs(existing.expiresAt - expiresAt) > 86400000) {
                            await prisma.certificate.update({ where: { id: existing.id }, data: { expiresAt } });
                            summary.updated++;
                        }
                    }
                } else if (existing && existing.status === 'ACTIVE') {
                    await prisma.certificate.update({ where: { id: existing.id }, data: { status: 'REVOKED' } });
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
                    summary.revoked++;
                }
            }
            summary.tracksProcessed++;
        }

        console.log('[ADMIN] Cert reconciliation complete:', summary);
        res.json({ message: 'Reconciliation complete', summary });
    } catch (error) {
        console.error('Cert reconciliation error:', error);
        res.status(500).json({ error: 'Reconciliation failed', summary });
    }
});

module.exports = router;
