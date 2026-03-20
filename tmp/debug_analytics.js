const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // 1. Find an admin to simulate
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!admin) {
        console.log('No admin found');
        return;
    }

    console.log('--- Simulating /api/admin/analytics ---');
    
    // Logic from admin.js
    const tracks = await prisma.track.findMany({
        where: { status: 'PUBLISHED' },
        include: {
            modules: { where: { status: 'PUBLISHED' } },
            users: {
                where: { role: 'LEARNER' },
                include: { 
                    enrollments: {
                        where: { completed: true }
                    } 
                }
            }
        }
    });

    console.log(`Found ${tracks.length} tracks in analytics:`);
    tracks.forEach(t => {
        console.log(`- ${t.name} (Status: ${t.status})`);
    });

    const modules = await prisma.module.findMany({
        where: { 
            status: 'PUBLISHED',
            track: { status: 'PUBLISHED' }
        },
        include: { track: true }
    });
    console.log(`\nFound ${modules.length} modules in analytics:`);
    modules.forEach(m => {
        console.log(`- ${m.title} (Track: ${m.track.name}, Status: ${m.track.status})`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
