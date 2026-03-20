const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const trackName = 'AI Engineering Fundamentals';
    
    // 1. Find the track
    const track = await prisma.track.findFirst({ where: { name: trackName } });
    if (!track) {
        console.log(`Track "${trackName}" not found.`);
        return;
    }
    console.log(`Track: ${track.name} | Current Status: ${track.status}`);

    // 2. Set to DRAFT
    console.log(`Setting "${trackName}" to DRAFT...`);
    await prisma.track.update({
        where: { id: track.id },
        data: { status: 'DRAFT' }
    });

    // 3. Re-simulate analytics (Section 2: Track Comparison)
    const tracks = await prisma.track.findMany({
        where: { status: 'PUBLISHED' }
    });
    
    const found = tracks.find(t => t.id === track.id);
    if (!found) {
        console.log(`✅ Success: Track "${trackName}" NO LONGER appears in filtered analytics tracks.`);
    } else {
        console.log(`❌ Failure: Track "${trackName}" STILL appears in filtered analytics tracks!`);
    }

    // 4. Restore status (Optional, but let's keep it draft for user to see)
    // console.log(`Restoring "${trackName}" to PUBLISHED...`);
    // await prisma.track.update({ where: { id: track.id }, data: { status: 'PUBLISHED' } });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
