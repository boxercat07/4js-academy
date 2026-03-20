const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        const userId = '4c5fefdf-51fb-442d-95b2-6e52e5d61a74'; 

        // Replicating logic from server/routes/progress.js:46
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                tracks: true,
                enrollments: { include: { module: true } }
            }
        });

        const allTracks = await prisma.track.findMany({
            include: {
                modules: { where: { status: 'PUBLISHED' } }
            }
        });

        const pendingQuizzes = [];
        allTracks.forEach(track => {
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

                const others = modules.filter(m => m.id !== quiz.id);
                const isStarted = others.some(m => {
                    const e = user.enrollments.find(en => en.moduleId === m.id);
                    return e && e.completed;
                });

                if (isStarted) {
                    pendingQuizzes.push({
                        trackId: track.id,
                        trackName: track.name,
                        moduleTitle: title,
                        quizId: quiz.id,
                        quizTitle: quiz.title
                    });
                }
            }
        });

        console.log('--- Pending Quizzes Result ---');
        console.log(JSON.stringify(pendingQuizzes, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

test();
