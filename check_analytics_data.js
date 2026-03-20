const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const tracks = await prisma.track.findMany({
        include: {
            modules: true
        }
    });

    console.log('TRACKS:');
    for (const t of tracks) {
        console.log(`- ${t.name} (ID: ${t.id}, Modules: ${t.modules.length})`);
        const moduleIds = t.modules.map(m => m.id);
        const enrollments = await prisma.enrollment.findMany({
            where: {
                moduleId: { in: moduleIds }
            }
        });
        const completed = enrollments.filter(e => e.completed).length;
        console.log(`  Enrollments: ${enrollments.length}, Completed: ${completed}`);
    }

    const allPublishedQuizzes = await prisma.module.findMany({
        where: { type: 'QUIZ', status: 'PUBLISHED' }
    });
    console.log(`\nPublished Quizzes Count: ${allPublishedQuizzes.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
