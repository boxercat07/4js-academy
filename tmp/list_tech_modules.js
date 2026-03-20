const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listTechModules() {
    try {
        const track = await prisma.track.findFirst({
            where: { name: 'TECHNICAL' }
        });

        if (!track) {
            console.log('Technical track not found');
            return;
        }

        const modules = await prisma.module.findMany({
            where: { trackId: track.id }
        });

        console.log(`Modules for TECHNICAL track (ID: ${track.id}):`);
        modules.forEach(m => {
            console.log(`- ID: ${m.id}, Title: ${m.title}, Status: ${m.status}, Order: ${m.order}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

listTechModules();
