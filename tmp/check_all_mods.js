const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllModules() {
    try {
        const track = await prisma.track.findFirst({
            where: { name: { contains: 'Business' } }
        });

        if (!track) {
            console.log('TRACK_NOT_FOUND');
            return;
        }

        const mods = await prisma.module.findMany({
            where: { trackId: track.id }
        });

        console.log(`Track: ${track.name} (${track.id}) STATUS: ${track.status}`);
        console.log(`Total Modules in DB: ${mods.length}`);
        mods.forEach(m => {
            console.log(`  - ${m.title} (${m.id}) Type: ${m.type} Status: ${m.status}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

checkAllModules();
