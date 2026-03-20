const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
    let output = '';

    const tracks = await prisma.track.findMany({
        where: { status: 'PUBLISHED' },
        select: { name: true, status: true }
    });

    output += '=== PUBLISHED TRACKS (what trackComparison returns) ===\n';
    tracks.forEach(t => {
        output += `  - "${t.name}" | status="${t.status}"\n`;
    });
    output += `  TOTAL: ${tracks.length}\n\n`;

    const allTracks = await prisma.track.findMany({
        select: { name: true, status: true }
    });

    output += '=== ALL TRACKS ===\n';
    allTracks.forEach(t => {
        output += `  - "${t.name}" | status="${t.status}"\n`;
    });
    output += `  TOTAL: ${allTracks.length}\n`;

    fs.writeFileSync('tmp/track_status_report.txt', output);
    console.log('Written to tmp/track_status_report.txt');
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
