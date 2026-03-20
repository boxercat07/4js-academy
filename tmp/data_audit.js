const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
    try {
        const tracks = await prisma.track.findMany({
            include: { modules: true }
        });

        const users = await prisma.user.findMany({
            include: { enrollments: true }
        });

        console.log(`JSON_START:${JSON.stringify({
            tracks: tracks.map(t => ({ id: t.id, status: t.status, modCount: t.modules.length, mods: t.modules.map(m => ({ id: m.id, status: m.status })) })),
            users: users.map(u => ({ name: u.firstName, enrollments: u.enrollments }))
        })}:JSON_END`);

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

checkData();
