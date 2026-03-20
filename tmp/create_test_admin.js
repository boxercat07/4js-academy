const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
    const email = 'admin_test@academy.com';
    const password = 'AdminPassword123!';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    try {
        const user = await prisma.user.upsert({
            where: { email },
            update: { role: 'ADMIN' },
            create: {
                email,
                firstName: 'Test',
                lastName: 'Admin',
                passwordHash,
                role: 'ADMIN',
                department: 'Management'
            }
        });
        console.log('Admin user created/updated:', user.email);
    } catch (error) {
        console.error('Error creating admin:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
