const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function test() {
    try {
        console.log('--- Testing Login Logic Fix ---');
        const email = 'jdoe@test.com';
        const password = 'password123';
        
        console.log(`[AUTH] Attempting login for: ${email}`);
        const user = await prisma.user.findUnique({ where: { email }, include: { tracks: true } });
        
        if (!user) {
            console.log(`[AUTH] User not found: ${email}`);
        } else {
            console.log(`[AUTH] User found: ${user.id}`);
            const isMatch = await bcrypt.compare(password, user.passwordHash);
            console.log(`[AUTH] Password match: ${isMatch}`);
        }
        
        console.log('--- Test Finished ---');
    } catch (err) {
        console.error('Test Failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

test();
