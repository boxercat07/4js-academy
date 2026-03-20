const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkJohn() {
    try {
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { firstName: { contains: 'John' } },
                    { lastName: { contains: 'Doe' } }
                ]
            },
            include: {
                enrollments: true
            }
        });

        if (!user) {
            console.log('John Doe not found');
            return;
        }

        console.log(`User: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
        console.log(`Selected Track: ${user.trackId}`);
        console.log(`Enrollments: ${user.enrollments.length}`);
        user.enrollments.forEach(e => {
            console.log(`- Module ${e.moduleId}: Progress ${e.progress}% Completed: ${e.completed}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

checkJohn();
