const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugDelete() {
    try {
        console.log('--- Listing Users ---');
        const users = await prisma.user.findMany({
            select: { id: true, email: true, firstName: true }
        });
        console.log(JSON.stringify(users, null, 2));

        if (users.length === 0) {
            console.log('No users found.');
            return;
        }

        // Try to find a non-admin user to test deletion on if possible
        // Actually, let's just create a dummy user to test deletion
        console.log('\n--- Creating Dummy User ---');
        const dummy = await prisma.user.create({
            data: {
                email: `test_delete_${Date.now()}@example.com`,
                firstName: 'Test',
                lastName: 'Delete',
                passwordHash: 'dummy'
            }
        });
        console.log('Created dummy user:', dummy.id);

        console.log('\n--- Attempting Deletion of Dummy User ---');
        // Manual cascade enrollments first just in case
        await prisma.enrollment.deleteMany({ where: { userId: dummy.id } });
        console.log('Enrollments cleared.');

        await prisma.user.delete({ where: { id: dummy.id } });
        console.log('User deleted successfully.');

    } catch (error) {
        console.error('\n--- DELETION FAILURE ---');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        if (error.meta) console.error('Error Meta:', error.meta);
    } finally {
        await prisma.$disconnect();
    }
}

debugDelete();
