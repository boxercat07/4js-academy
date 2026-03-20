const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const trackId = '8ec8753d-008e-4a0b-b038-cfd3da7c4ab7';
    console.log('Searching for Track ID:', trackId);
    
    const track = await prisma.track.findUnique({
        where: { id: trackId }
    });
    
    if (track) {
        console.log('Track Found:');
        console.log(JSON.stringify(track, null, 2));
    } else {
        console.log('Track NOT Found.');
        const allTracks = await prisma.track.findMany();
        console.log('Available Track IDs:');
        allTracks.forEach(t => console.log(`- ${t.id} (${t.name})`));
    }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
