const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateAll() {
    const result = await prisma.track.updateMany({
        data: { icon: 'rocket' }
    });
    console.log(`Updated ${result.count} tracks.`);
    const tracks = await prisma.track.findMany();
    tracks.forEach(t => console.log(`Track: ${t.name} | Icon: ${t.icon}`));
}

updateAll().finally(() => prisma.$disconnect());
