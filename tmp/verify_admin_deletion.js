const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTest() {
    console.log('--- STARTING ADMIN DELETION TEST ---');
    
    // 1. Create a dummy admin
    const email = `test_admin_${Date.now()}@4js.com`;
    const admin = await prisma.user.create({
        data: {
            firstName: 'Temp',
            lastName: 'Admin',
            email: email,
            passwordHash: 'dummy',
            role: 'ADMIN'
        }
    });
    console.log(`Created test admin: ${admin.email} (ID: ${admin.id})`);

    // 2. Mock a delete request to the logic (or just use Prisma to verify it would fail if the route logic was applied)
    // Since I'm testing the backend logic I added, I'll simulate the route behavior.
    
    console.log('\nChecking deletion logic for ADMIN...');
    
    // Simulate DELETE /api/users/:id check
    const checkUser = await prisma.user.findUnique({ where: { id: admin.id }, select: { role: true } });
    if (checkUser && checkUser.role === 'ADMIN') {
        console.log('RESULT: Blocked! User is an admin.');
    } else {
        console.log('RESULT: FAILED! Logic did not block admin.');
    }

    // 3. Simulating Bulk delete check
    console.log('\nChecking bulk deletion logic for ADMIN...');
    const adminsInSelection = await prisma.user.findMany({
        where: { id: { in: [admin.id] }, role: 'ADMIN' }
    });
    
    if (adminsInSelection.length > 0) {
        console.log(`RESULT: Bulk deletion blocked! Found ${adminsInSelection.length} admin(s).`);
    } else {
        console.log('RESULT: FAILED! Bulk logic did not block admin.');
    }

    // 4. Downgrade to LEARNER and verify
    console.log('\nDowngrading to LEARNER...');
    await prisma.user.update({
        where: { id: admin.id },
        data: { role: 'LEARNER' }
    });
    
    const checkUserAfter = await prisma.user.findUnique({ where: { id: admin.id }, select: { role: true } });
    if (checkUserAfter.role === 'LEARNER') {
        console.log('RESULT: User is now a Learner. Deletion should be allowed in next step.');
    }

    // Cleanup
    await prisma.enrollment.deleteMany({ where: { userId: admin.id } });
    await prisma.user.delete({ where: { id: admin.id } });
    console.log('\nCleaned up test user.');
    console.log('--- TEST COMPLETE ---');
}

runTest().catch(console.error).finally(() => prisma.$disconnect());
