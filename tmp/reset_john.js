require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    // Find users with "john" or "doe" in their name/email
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { firstName: { contains: 'john', mode: 'insensitive' } },
                { lastName: { contains: 'doe', mode: 'insensitive' } },
                { email: { contains: 'john', mode: 'insensitive' } }
            ]
        }
    });

    if (users.length === 0) {
        console.log('No John Doe user found.');
        return;
    }

    for (const u of users) {
        console.log(`Found: ${u.firstName} ${u.lastName} | Email: ${u.email} | Role: ${u.role}`);
    }

    // Reset password to 'password123' for the first match
    const newPassword = 'password123';
    const hashed = await bcrypt.hash(newPassword, 10);

    for (const u of users) {
        await prisma.user.update({
            where: { id: u.id },
            data: { passwordHash: hashed }
        });
        console.log(`✅ Password reset to "${newPassword}" for ${u.email}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
