const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        console.log('Testing track query...');
        const tracks = await prisma.track.findMany({
            include: {
                ratings: {
                    select: { stars: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        console.log(`Found ${tracks.length} tracks.`);

        const tracksWithStats = tracks.map(t => {
            const count = t.ratings.length;
            const avg = count > 0 ? t.ratings.reduce((acc, r) => acc + r.stars, 0) / count : 0;
            const { ratings, ...trackData } = t;
            return {
                ...trackData,
                averageRating: parseFloat(avg.toFixed(1)),
                ratingCount: count
            };
        });

        console.log('Successfully processed tracks with stats.');
        if (tracksWithStats.length > 0) {
            console.log('Sample track:', JSON.stringify(tracksWithStats[0], null, 2));
        }
    } catch (error) {
        console.error('Error during test:', error);
    } finally {
        await prisma.$disconnect();
    }
}

test();
