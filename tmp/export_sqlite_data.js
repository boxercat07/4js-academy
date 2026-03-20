// Export all data from SQLite via Prisma before migration
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function exportData() {
    try {
        console.log('Exporting data from SQLite...');

        const users = await prisma.user.findMany();
        console.log(`Users: ${users.length}`);

        const tracks = await prisma.track.findMany();
        console.log(`Tracks: ${tracks.length}`);

        const modules = await prisma.module.findMany();
        console.log(`Modules: ${modules.length}`);

        const enrollments = await prisma.enrollment.findMany();
        console.log(`Enrollments: ${enrollments.length}`);

        // Get the User-Track many-to-many relation
        const usersWithTracks = await prisma.user.findMany({
            include: { tracks: { select: { id: true } } }
        });
        const userTrackRelations = [];
        for (const user of usersWithTracks) {
            for (const track of user.tracks) {
                userTrackRelations.push({ userId: user.id, trackId: track.id });
            }
        }
        console.log(`User-Track relations: ${userTrackRelations.length}`);

        const data = { users, tracks, modules, enrollments, userTrackRelations };

        const outputPath = path.join(__dirname, 'sqlite_export.json');
        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
        console.log(`\nData exported to: ${outputPath}`);
        console.log('Export complete!');
    } catch (error) {
        console.error('Export failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

exportData();
