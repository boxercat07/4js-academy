const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/progress/complete - Mark a module (content item) as completed or update attempt context
router.post('/complete', verifyToken, async (req, res) => {
    try {
        const { moduleId, score, completed = true } = req.body;
        const userId = req.user.id;

        if (!moduleId) {
            return res.status(400).json({ error: 'moduleId is required' });
        }

        // Find current enrollment to get current attempts
        const current = await prisma.enrollment.findUnique({
            where: { userId_moduleId: { userId, moduleId } }
        });

        const enrollment = await prisma.enrollment.upsert({
            where: {
                userId_moduleId: {
                    userId: userId,
                    moduleId: moduleId
                }
            },
            update: {
                progress: completed ? 100 : (score || 0),
                completed: completed,
                attempts: { increment: 1 },
                lastScore: score !== undefined ? score : undefined
            },
            create: {
                userId: userId,
                moduleId: moduleId,
                progress: completed ? 100 : (score || 0),
                completed: completed,
                attempts: 1,
                lastScore: score !== undefined ? score : undefined
            }
        });

        // Milestone Detection Logic
        if (completed) {
            try {
                const moduleWithTrack = await prisma.module.findUnique({
                    where: { id: moduleId },
                    include: { track: { include: { modules: { where: { status: 'PUBLISHED' } } } } }
                });

                if (moduleWithTrack && moduleWithTrack.track && moduleWithTrack.track.status === 'PUBLISHED') {
                    const track = moduleWithTrack.track;
                    const totalModules = track.modules.length;
                    
                    if (totalModules > 0) {
                        const trackModuleIds = track.modules.map(m => m.id);
                        const completedInTrack = await prisma.enrollment.count({
                            where: {
                                userId: userId,
                                completed: true,
                                moduleId: { in: trackModuleIds }
                            }
                        });

                        const progressPercent = Math.round((completedInTrack / totalModules) * 100);
                        
                        // Possible milestones: 50, 75, 100
                        const thresholds = [50, 75, 100];
                        for (const threshold of thresholds) {
                            if (progressPercent >= threshold) {
                                // Check if already reached
                                const existing = await prisma.userMilestone.findUnique({
                                    where: {
                                        userId_trackId_milestone: {
                                            userId,
                                            trackId: track.id,
                                            milestone: threshold
                                        }
                                    }
                                });

                                if (!existing) {
                                    // Mark as reached
                                    await prisma.userMilestone.create({
                                        data: {
                                            userId,
                                            trackId: track.id,
                                            milestone: threshold
                                        }
                                    });

                                    // Create notification
                                    let title = 'Milestone Reached!';
                                    let message = `🚀 Major milestone reached: ${threshold}% of ${track.name} completed.`;
                                    if (threshold === 100) {
                                        title = 'Track Completed!';
                                        message = `🏅 Finished ${track.name} track. Great job!`;
                                    }

                                    await prisma.notification.create({
                                        data: {
                                            userId,
                                            type: threshold === 100 ? 'TRACK_COMPLETED' : 'MILESTONE',
                                            title,
                                            message
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('Milestone detection error:', err);
                // Don't fail the main request if milestone detection fails
            }
        }

        res.json({ message: 'Progress updated', enrollment });
    } catch (error) {
        console.error('Update progress error:', error);
        res.status(500).json({ error: 'Failed to update progress' });
    }
});

// GET /api/progress/dashboard - Get course-specific progress and milestones for the logged-id user
router.get('/dashboard', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch user with enrollments and their selected track
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                tracks: true,
                enrollments: { include: { module: true } }
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Fetch all tracks with their published modules
        const allTracks = await prisma.track.findMany({
            where: { status: 'PUBLISHED' },
            include: {
                modules: { where: { status: 'PUBLISHED' } }
            }
        });

        // 1. Calculate progress per track
        const trackProgress = allTracks.map(track => {
            const totalModules = track.modules.length;
            if (totalModules === 0) return { id: track.id, progress: 0, status: 'NOT_STARTED' };

            // Find completions for modules belonging to this track
            const moduleIds = track.modules.map(m => m.id);
            const completedInTrack = user.enrollments.filter(e => e.completed && moduleIds.includes(e.moduleId)).length;

            const percent = Math.round((completedInTrack / totalModules) * 100);
            let status = 'NOT_STARTED';
            if (percent >= 100) status = 'COMPLETED';
            else if (percent > 0) status = 'IN_PROGRESS';

            return {
                id: track.id,
                name: track.name,
                progress: percent,
                status: status
            };
        });

        // 2. Identify milestones (50%, 75%, 100%)
        // For simplicity, we just check current progress levels
        const milestones = [];
        trackProgress.forEach(tp => {
            if (tp.progress >= 100) {
                milestones.push({ type: 'COMPLETE', trackName: tp.name, value: 100 });
            } else if (tp.progress >= 75) {
                milestones.push({ type: 'MILESTONE', trackName: tp.name, value: 75 });
            } else if (tp.progress >= 50) {
                milestones.push({ type: 'MILESTONE', trackName: tp.name, value: 50 });
            }
        });

        // 3. Identify pending quizzes (Started but quiz not completed)
        const pendingQuizzes = [];
        allTracks.forEach(track => {
            // Group this track's modules by description (UI Group)
            const groups = {};
            track.modules.forEach(m => {
                const groupTitle = m.description || 'General';
                if (!groups[groupTitle]) groups[groupTitle] = [];
                groups[groupTitle].push(m);
            });

            for (const [title, modules] of Object.entries(groups)) {
                const quiz = modules.find(m => m.type === 'QUIZ');
                if (!quiz) continue;

                const quizEnrollment = user.enrollments.find(e => e.moduleId === quiz.id);
                if (quizEnrollment && quizEnrollment.completed) continue;

                // Check if ANY other module in this group is completed
                const others = modules.filter(m => m.id !== quiz.id);
                const isStarted = others.some(m => {
                    const e = user.enrollments.find(en => en.moduleId === m.id);
                    return e && e.completed;
                });

                if (isStarted) {
                    pendingQuizzes.push({
                        trackId: track.id,
                        trackName: track.name,
                        trackSlug: track.slug,
                        moduleTitle: title,
                        quizId: quiz.id,
                        quizTitle: quiz.title
                    });
                }
            }
        });

        const completedModuleIds = user.enrollments.filter(e => e.completed).map(e => e.moduleId);
        // Enrolled track IDs come from user.tracks + any track where user has completed something
        const enrolledTrackIds = new Set(user.tracks.map(t => t.id));
        allTracks.filter(t => t.modules.some(m => completedModuleIds.includes(m.id))).forEach(t => enrolledTrackIds.add(t.id));

        let overallProgress = 0;
        if (enrolledTrackIds.size > 0) {
            let totalCompletedInActive = 0;
            let totalModulesInActive = 0;

            allTracks.forEach(track => {
                if (enrolledTrackIds.has(track.id)) {
                    totalModulesInActive += track.modules.length;
                    const trackModuleIds = track.modules.map(m => m.id);
                    const completedInTrack = user.enrollments.filter(e => e.completed && trackModuleIds.includes(e.moduleId)).length;
                    totalCompletedInActive += completedInTrack;
                }
            });

            if (totalModulesInActive > 0) {
                overallProgress = Math.round((totalCompletedInActive / totalModulesInActive) * 100);
            }
            console.log(`[PROGRESS_DEBUG] User: ${user.firstName}, ActiveTracks: ${enrolledTrackIds.size}, Completed: ${totalCompletedInActive}, Total: ${totalModulesInActive}, Result: ${overallProgress}`);
        } else {
            console.log(`[PROGRESS_DEBUG] User: ${user.firstName}, No Active Tracks`);
        }

        res.json({
            trackProgress,
            overallProgress,
            milestones: milestones.slice(0, 3),
            pendingQuizzes
        });

    } catch (error) {
        console.error('Dashboard progress error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard progress' });
    }
});

// GET/POST /api/progress/summary - Get flat list of completed module IDs for content locking/display
router.all('/summary', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const enrollments = await prisma.enrollment.findMany({
            where: { userId, completed: true },
            select: { moduleId: true }
        });
        res.json({ progress: enrollments });
    } catch (error) {
        console.error('Summary progress error:', error);
        res.status(500).json({ error: 'Failed' });
    }
});

module.exports = router;
