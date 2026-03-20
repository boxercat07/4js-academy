const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function testPasswordReset() {
    console.log('--- TESTING PASSWORD RESET ---');
    const email = 'vincent.martinet@4js.com'; 
    const newPassword = 'NewSecretPassword2026!';

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            console.error('User not found');
            return;
        }

        console.log(`User found: ${user.firstName} ${user.lastName}`);
        
        // Simulate the backend logic
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);

        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: hash }
        });

        console.log('Password hash updated in DB');

        // Verify the hash
        const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
        const isMatch = await bcrypt.compare(newPassword, updatedUser.passwordHash);
        
        if (isMatch) {
            console.log('SUCCESS: New password correctly hashes and matches.');
        } else {
            console.error('FAILURE: New password does NOT match the stored hash.');
        }

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testPasswordReset();
