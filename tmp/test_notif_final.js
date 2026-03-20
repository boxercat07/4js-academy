const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        console.log('--- Testing Notification Deletion ---');
        
        // 1. Create a test notification
        const user = await prisma.user.findFirst();
        if (!user) throw new Error('No users found');
        
        const notif = await prisma.notification.create({
            data: {
                userId: user.id,
                type: 'TEST',
                title: 'Test Deletion',
                message: 'This should be deleted'
            }
        });
        console.log('Created test notification:', notif.id);
        
        // 2. Delete it via Prisma (direct DB test first)
        const deleted = await prisma.notification.delete({
            where: { id: notif.id }
        });
        console.log('Successfully deleted notification via Prisma:', deleted.id);
        
        console.log('--- Test Passed ---');
    } catch (err) {
        console.error('Test Failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

test();
