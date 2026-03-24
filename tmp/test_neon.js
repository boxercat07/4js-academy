require('dotenv').config({ path: '.env' });
const prisma = require('../server/prisma'); // Use the same prisma client

async function run() {
    try {
        console.log('Testing GET /api/ratings/:id/stats query...');

        // Find a track first
        const sampleTrack = await prisma.track.findFirst();
        if (!sampleTrack) {
            console.log('No tracks found');
            return;
        }

        const trackId = sampleTrack.id;
        console.log(`Using trackId ${trackId}`);
        const [track, ratings] = await Promise.all([
            prisma.track.findUnique({
                where: { id: trackId },
                select: { id: true }
            }),
            prisma.rating.findMany({
                where: { trackId },
                select: { stars: true }
            })
        ]);
        console.log('Ratings query successful:', { track, ratingsCount: ratings.length });
    } catch (e) {
        console.error('Error in Ratings query:', e);
    }

    try {
        console.log('\\nTesting GET /api/tracks query...');
        const tracks = await prisma.track.findMany({
            orderBy: { createdAt: 'desc' }
        });
        console.log('Tracks query successful, mapped tracks:', tracks.length);
    } catch (e) {
        console.error('Error in GET /api/tracks query:', e);
    }

    try {
        console.log('\\nTesting POST /api/users/track query (mimicking logic)...');
        // Looking up the endpoint
        console.log('Finding user...');
        const user = await prisma.user.findFirst();
        if (user) {
            console.log('Updating user track using raw SQL (if that was the method)...');
            // just a dummy query to test the neon http adapter
            const res = await prisma.$executeRaw`SELECT 1`;
            console.log('Raw SQL execute successful:', res);
        }
    } catch (e) {
        console.error('Error in users/track mock:', e);
    }
}

run()
    .catch(console.error)
    .finally(() => process.exit(0));
