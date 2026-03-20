const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkJohnProgress() {
    try {
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { firstName: 'John' },
                    { email: { contains: 'john' } }
                ]
            },
            include: {
                enrollments: {
                    include: { module: true }
                }
            }
        });

        if (!user) {
            console.log('John Doe not found');
            return;
        }

        console.log(`Checking user: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
        console.log(`Department: ${user.department}`);
        console.log(`Enrollments count: ${user.enrollments.length}`);
        user.enrollments.forEach(e => {
            console.log(`  - Module: ${e.module.title} (Type: ${e.module.type}, Completed: ${e.completed}, Progress: ${e.progress}%)`);
        });

        // Fetch all tracks
        const tracks = await prisma.track.findMany({
            include: {
                modules: true // Fetch all to see what's there
            }
        });

        console.log(`\nTracks found: ${tracks.length}`);
        tracks.forEach(t => console.log(`  - Track: ${t.name} (Status: ${t.status}, Modules: ${t.modules.length})`));

        console.log('\n--- Analyzing Pending Quizzes Logic ---');
        
        tracks.forEach(track => {
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
                const quizCompleted = quizEnrollment && quizEnrollment.completed;

                const others = modules.filter(m => m.id !== quiz.id);
                const completions = others.map(m => {
                    const e = user.enrollments.find(en => en.moduleId === m.id);
                    return { title: m.title, completed: !!(e && e.completed) };
                });

                const isStarted = completions.some(c => c.completed);

                console.log(`Track: ${track.name} | Group: ${title}`);
                console.log(`  Quiz: ${quiz.title} (Completed: ${quizCompleted})`);
                console.log(`  Started (any other item completed): ${isStarted}`);
                completions.forEach(c => {
                    console.log(`    - ${c.title}: ${c.completed}`);
                });

                if (isStarted && !quizCompleted) {
                    console.log('  >>> SHOULD SHOW AS PENDING');
                }
            }
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkJohnProgress();
