const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const tracks = await prisma.track.findMany();
    console.log('--- ALL TRACKS ---');
    tracks.forEach(t => {
        if (t.name.toLowerCase().includes('ai')) {
            console.log(`- NAME: "${t.name}" | STATUS: "${t.status}" | ID: "${t.id}"`);
        }
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
