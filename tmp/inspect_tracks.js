const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const tracks = await prisma.track.findMany({
            where: {
                title: {
                    contains: 'genero',
                    mode: 'insensitive'
                }
            }
        });

        console.log(`Found ${tracks.length} matching tracks.`);

        for (const track of tracks) {
            console.log(`Track: ${track.title} (ID: ${track.id})`);
            try {
                const curriculum = JSON.parse(track.curriculum || '[]');
                curriculum.forEach((module, mIdx) => {
                    console.log(`  Module ${mIdx + 1}: ${module.title}`);
                    (module.items || []).forEach((item, iIdx) => {
                        console.log(`    Item ${iIdx + 1}: ${item.title} (Type: ${item.type}, URL: ${item['blob-url']?.substring(0, 50)}...)`);
                        if (item['blob-url']?.includes('Page Test') || item.title?.includes('Page Test')) {
                            console.log('    !!! FOUND PAGE TEST !!!');
                        }
                    });
                });
            } catch (e) {
                console.error(`  Error parsing curriculum for track ${track.id}:`, e.message);
            }
        }
    } catch (err) {
        console.error('Database query error:', err);
    }

    console.log('\n--- Searching All Tracks for "Page Test" ---');
    const allTracks = await prisma.track.findMany();
    allTracks.forEach(track => {
        if (track.curriculum?.includes('Page Test')) {
            console.log(`Found in Track: ${track.title} (ID: ${track.id})`);
        }
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
