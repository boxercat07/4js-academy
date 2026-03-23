const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function checkPasswords() {
    console.log('Checking current passwords in database...');

    const users = await prisma.user.findMany({
        select: { id: true, email: true, passwordHash: true }
    });

    for (const user of users) {
        const isHashed = user.passwordHash.startsWith('$');
        console.log(`${user.email}: ${isHashed ? 'HASHED' : 'PLAIN'} - ${user.passwordHash.substring(0, 20)}...`);

        // Test known passwords
        if (user.email === 'vincent.martinet@4js.com') {
            const test1 = await bcrypt.compare('admin123', user.passwordHash);
            const test2 = user.passwordHash === 'admin123';
            console.log(`  admin123: bcrypt=${test1}, plain=${test2}`);
        }
        if (user.email === 'jdoe@test.com') {
            const test1 = await bcrypt.compare('password123', user.passwordHash);
            const test2 = user.passwordHash === 'password123';
            console.log(`  password123: bcrypt=${test1}, plain=${test2}`);
        }
    }

    console.log('Done!');
}

checkPasswords()
    .catch(console.error)
    .finally(() => prisma.$disconnect());