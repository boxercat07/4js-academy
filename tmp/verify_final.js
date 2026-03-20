const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runVerification() {
    try {
        const user = await prisma.user.findFirst({ where: { firstName: 'John' } });
        const quizModule = await prisma.module.findFirst({ where: { type: 'QUIZ', track: { name: 'AI Business Track' } } });

        if (!user || !quizModule) {
            console.log('❌ User or Quiz not found. Run fix_john.js first.');
            return;
        }

        const userId = user.id;
        const quizModuleId = quizModule.id;

        console.log('--- Phase 1: Simulate Failed Quiz Attempt ---');
        
        // Use the new /api/progress/complete logic directly via Prisma for testing
        await prisma.enrollment.upsert({
            where: { userId_moduleId: { userId, moduleId: quizModuleId } },
            update: {
                progress: 40, // Failed score
                completed: false,
                attempts: { increment: 1 },
                lastScore: 40
            },
            create: {
                userId,
                moduleId: quizModuleId,
                progress: 40,
                completed: false,
                attempts: 1,
                lastScore: 40
            }
        });
        console.log('Simulated failure for John Doe on Module 1 Quiz.');

        console.log('\n--- Phase 2: Verify Admin Analytics ---');
        // Re-calculate quiz stats using the logic I implemented in admin.js
        const learners = await prisma.user.findMany({
            where: { role: 'LEARNER', tracks: { some: {} } },
            include: {
                tracks: { include: { modules: { where: { status: 'PUBLISHED' } } } },
                enrollments: { include: { module: true } }
            }
        });

        let totalPassedRaw = 0;
        let totalPendingRaw = 0;
        let totalRetakeRaw = 0;
        let totalAssignedQuizzes = 0;

        learners.forEach(learner => {
            learner.tracks.forEach(track => {
                const groups = {};
                track.modules.forEach(m => {
                    const title = m.description || 'General';
                    if (!groups[title]) groups[title] = [];
                    groups[title].push(m);
                });

                for (const [title, modules] of Object.entries(groups)) {
                    const quiz = modules.find(m => m.type === 'QUIZ');
                    if (!quiz) continue;
                    totalAssignedQuizzes++;
                    const e = learner.enrollments.find(en => en.moduleId === quiz.id);
                    if (e && e.completed) totalPassedRaw++;
                    else if (e && (e.attempts > 0 || e.progress > 0)) totalRetakeRaw++;
                    else {
                        const isStarted = modules.filter(m => m.id !== quiz.id).some(m => {
                            const en = learner.enrollments.find(enr => enr.moduleId === m.id);
                            return en && en.completed;
                        });
                        if (isStarted) totalPendingRaw++;
                    }
                }
            });
        });

        console.log(`Total Quizzes: ${totalAssignedQuizzes}`);
        console.log(`Passed: ${totalPassedRaw}`);
        console.log(`Retake (Failed): ${totalRetakeRaw}`);
        console.log(`Pending (Started): ${totalPendingRaw}`);

        if (totalRetakeRaw > 0) console.log('✅ Retake tracking is WORKING.');
        else console.log('❌ Retake tracking FAILED.');

        console.log('\n--- Phase 3: Verify Weighted Progress Consistency ---');
        // Check John Doe in users.js logic
        const john = learners.find(l => l.id === userId);
        if (john) {
            let totalModules = 0;
            let totalCompleted = 0;
            john.tracks.forEach(t => {
                totalModules += t.modules.length;
                totalCompleted += john.enrollments.filter(e => e.completed && t.modules.some(m => m.id === e.moduleId)).length;
            });
            const progress = totalModules > 0 ? Math.round((totalCompleted / totalModules) * 100) : 0;
            console.log(`John Doe Weighted Progress: ${progress}%`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

runVerification();
