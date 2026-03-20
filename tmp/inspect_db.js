const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { firstName: 'John' },
                    { email: { contains: 'john' } }
                ]
            },
            include: { enrollments: { include: { module: true } } }
        });

        if (!user) {
            console.log('John Doe not found');
            return;
        }

        console.log(`User: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
        
        const tracks = await prisma.track.findMany({
            include: { modules: true }
        });

        tracks.forEach(t => {
            console.log(`\nTrack: ${t.name} (${t.id})`);
            const groups = {};
            t.modules.forEach(m => {
                const groupTitle = m.description || 'General';
                if (!groups[groupTitle]) groups[groupTitle] = [];
                groups[groupTitle].push(m);
            });

            for (const [title, modules] of Object.entries(groups)) {
                console.log(`  Group: ${title}`);
                modules.forEach(m => {
                    const e = user.enrollments.find(en => en.moduleId === m.id);
                    console.log(`    - [${m.status}] ${m.type}: ${m.title} (Completed: ${!!(e && e.completed)})`);
                });
            }
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
