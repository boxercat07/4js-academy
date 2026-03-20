const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
    try {
        const tracks = await prisma.track.findMany({
            include: { modules: true }
        });

        tracks.forEach(t => {
            console.log(`Track: ${t.name} (ID: ${t.id}) STATUS: ${t.status}`);
            console.log(`  Modules: ${t.modules.length}`);
            t.modules.forEach(m => {
                console.log(`    - ${m.title} (${m.id}) STATUS: ${m.status}`);
            });
        });

        const users = await prisma.user.findMany({
            include: { tracks: true, enrollments: true }
        });

        users.forEach(u => {
            if (u.enrollments.length > 0) {
                console.log(`User: ${u.firstName} ${u.lastName} tracks: ${u.tracks.map(t => t.name).join(', ')}`);
                u.enrollments.forEach(e => {
                    console.log(`  - Module ${e.moduleId} Completed: ${e.completed}`);
                });
            }
        });

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

checkData();
