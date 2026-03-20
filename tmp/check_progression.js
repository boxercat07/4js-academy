const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProgression() {
    try {
        const user = await prisma.user.findFirst({
            where: { email: 'jdoe@4js.com' },
            include: { enrollments: true }
        });

        if (!user) {
            console.log('User not found');
            return;
        }

        console.log(`User: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
        console.log(`Enrollments count: ${user.enrollments.length}`);

        const modules = await prisma.module.findMany({
            include: { track: true }
        });

        console.log('\nModules in DB:');
        modules.forEach(m => {
            console.log(`- ID: ${m.id}, Title: ${m.title}, Track: ${m.track.name}, Status: ${m.status}`);
        });

        if (user.enrollments.length > 0) {
            console.log('\nEnrollments:');
            user.enrollments.forEach(e => {
                const mod = modules.find(m => m.id === e.moduleId);
                console.log(`- Module: ${mod ? mod.title : 'UNKNOWN'} (ID: ${e.moduleId}), Completed: ${e.completed}, Progress: ${e.progress}`);
            });
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

checkProgression();
