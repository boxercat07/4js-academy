const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkJohn() {
    try {
        const user = await prisma.user.findFirst({
            where: { firstName: 'John' },
            include: { tracks: true, enrollments: true }
        });

        if (!user) {
            console.log('NOT_FOUND');
            return;
        }

        console.log(`JSON_START:${JSON.stringify({
            id: user.id,
            tracks: user.tracks.map(t => t.id),
            enrollments: user.enrollments.map(e => ({ mid: e.moduleId, comp: e.completed }))
        })}:JSON_END`);

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

checkJohn();
