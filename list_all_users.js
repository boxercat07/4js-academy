const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        include: { track: true }
    });

    console.log('USERS:');
    for (const u of users) {
        console.log(`- ${u.firstName} ${u.lastName} (${u.email}), Role: ${u.role}, Track: ${u.track ? u.track.name : 'None'}`);
    }

    const tracks = await prisma.track.findMany();
    console.log('\nTRACKS:');
    for (const t of tracks) {
        console.log(`- ${t.name} (ID: ${t.id}, Status: ${t.status})`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
