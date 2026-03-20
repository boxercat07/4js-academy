const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testUpsert() {
    try {
        const userId = '4c5fefdf-51fb-442d-95b2-6e52e5d61a74'; // John Doe
        
        // Find any published module ID
        const module = await prisma.module.findFirst({
            where: { status: 'PUBLISHED' }
        });

        if (!module) {
            console.log('No modules found');
            return;
        }

        console.log(`Testing upsert for User ${userId} and Module ${module.id} (${module.title})`);

        const enrollment = await prisma.enrollment.upsert({
            where: {
                userId_moduleId: {
                    userId: userId,
                    moduleId: module.id
                }
            },
            update: { progress: 100, completed: true },
            create: { userId: userId, moduleId: module.id, progress: 100, completed: true }
        });

        console.log('UPSERT SUCCESS:', enrollment);
    } catch (err) {
        console.error('UPSERT FAILED:');
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

testUpsert();
