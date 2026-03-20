const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDetails() {
    try {
        const users = await prisma.user.findMany({ include: { track: true } });
        console.log('--- USER LIST ---');
        users.forEach(u => {
            console.log(`ID: ${u.id}`);
            console.log(`Email: ${u.email}`);
            console.log(`Name: ${u.firstName} ${u.lastName}`);
            console.log(`Track: ${u.track ? u.track.name : 'NONE'}`);
            console.log('---');
        });

        const enrollments = await prisma.enrollment.findMany();
        console.log(`\nTOTAL ENROLLMENTS IN DB: ${enrollments.length}`);
        enrollments.forEach(e => {
            console.log(`UserID: ${e.userId}, ModuleID: ${e.moduleId}, Completed: ${e.completed}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

checkDetails();
