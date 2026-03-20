const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const list = await prisma.track.findMany({
        where: { name: { contains: 'AI Engineering', mode: 'insensitive' } }
    });
    
    if (list.length === 0) {
        console.log('No track found with name containing "AI Engineering"');
    } else {
        list.forEach(t => {
            console.log(`- TRACK: "${t.name}" | STATUS: "${t.status}" | ID: "${t.id}"`);
        });
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
