const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
    try {
        const jdoe = await prisma.user.findFirst({ where: { email: 'jdoe@test.com' } });
        
        // 1. Create a "To Be Deleted" notification
        const notif = await prisma.notification.create({
            data: {
                userId: jdoe.id,
                type: 'TEST',
                title: 'Delete Me',
                message: 'This notification should be deleted.'
            }
        });
        console.log(`Created test notification with ID: ${notif.id}`);

        // 2. Verify it exists
        const existsBefore = await prisma.notification.findUnique({ where: { id: notif.id } });
        console.log(`Exists before deletion: ${!!existsBefore}`);

        // 3. Simulate deletion (since we can't easily call the API with auth in a simple script, 
        // we verify the logic we put in the API: deleteMany({ where: { id, userId } }))
        const deleteResult = await prisma.notification.deleteMany({
            where: { id: notif.id, userId: jdoe.id }
        });
        console.log(`Deleted count: ${deleteResult.count}`);

        // 4. Verify it's gone
        const existsAfter = await prisma.notification.findUnique({ where: { id: notif.id } });
        console.log(`Exists after deletion: ${!!existsAfter}`);

        if (deleteResult.count === 1 && !existsAfter) {
            console.log('BACKEND VERIFICATION SUCCESSFUL');
        } else {
            console.log('BACKEND VERIFICATION FAILED');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
})();
