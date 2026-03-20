const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkModule() {
    try {
        const mod = await prisma.module.findUnique({
            where: { id: 'test-video-mod-1' },
            include: { track: true }
        });

        if (!mod) {
            console.log('MODULE_NOT_FOUND');
            return;
        }

        console.log(`Module: ${mod.title} (${mod.id}) STATUS: ${mod.status}`);
        console.log(`Track: ${mod.track.name} (${mod.track.id}) STATUS: ${mod.track.status}`);

        const trackMods = await prisma.module.findMany({
            where: { trackId: mod.trackId }
        });
        console.log(`Track has ${trackMods.length} modules:`);
        trackMods.forEach(m => {
            console.log(`  - ${m.title} (${m.id}) STATUS: ${m.status}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

checkModule();
