const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/admin/analytics - Global analytics for the dashboard
router.get('/analytics', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { period } = req.query;
        let startDate = null;

        if (period && period !== 'all') {
            const days = parseInt(period);
            if (!isNaN(days)) {
                startDate = new Date();
                startDate.setDate(startDate.getDate() - days);
            }
        }

        const dateFilter = startDate ? { updatedAt: { gte: startDate } } : {};

        // 1. Stats Overview
        const totalUsers = await prisma.user.count({ 
            where: { 
                role: 'LEARNER',
                tracks: { some: {} }
            } 
        });

        // 2. Track Comparison
        const tracks = await prisma.track.findMany({
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

        const trackComparison = tracks.map(track => {
            const totalModules = track.modules.length;
            const userProgressions = track.users.map(user => {
                const userCompleted = user.enrollments.length;
                return totalModules > 0 ? (userCompleted / totalModules) * 100 : 0;
            });
            const avgProgress = userProgressions.length > 0 
                ? userProgressions.reduce((a, b) => a + b, 0) / userProgressions.length 
                : 0;

            return {
                name: track.name,
                avgProgress: Math.round(avgProgress)
            };
        }).sort((a, b) => b.avgProgress - a.avgProgress);

        // 3. Recent Activity - Milestones
        const recentCompletions = await prisma.enrollment.findMany({
            take: 100,
            where: {
                completed: true,
                ...dateFilter,
                user: {
                    role: 'LEARNER',
                    tracks: { some: {} }
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
            if (activity.length >= 5) break;

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
                tracks: { some: {} }
            },
            include: {
                tracks: {
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
            notStartedRatio: totalAssignedQuizzes > 0 ? Math.round((totalNotStartedRaw / totalAssignedQuizzes) * 100) : 0,
            retakeRatio: totalAssignedQuizzes > 0 ? Math.round((totalRetakeRaw / totalAssignedQuizzes) * 100) : 0,
            passedRaw: totalPassedRaw,
            pendingRaw: totalPendingRaw,
            notStartedRaw: totalNotStartedRaw,
            retakeRaw: totalRetakeRaw
        };

        // 5. Top Performing Modules
        const modules = await prisma.module.findMany({
            where: { status: 'PUBLISHED' },
            include: {
                enrollments: {
                    where: dateFilter 
                },
                track: true
            }
        });

        const topModules = modules.map(m => {
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
            where: { role: 'LEARNER' },
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

module.exports = router;
