const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function hashPlainTextPasswords() {
    console.log('Checking for plain text passwords...');

    const users = await prisma.user.findMany({
        select: { id: true, email: true, passwordHash: true }
    });

    for (const user of users) {
        if (!user.passwordHash.startsWith('$')) {
            console.log(`Hashing password for ${user.email}`);
            const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash(user.passwordHash, salt);

            await prisma.user.update({
                where: { id: user.id },
                data: { passwordHash: hashed }
            });

            console.log(`✅ Hashed password for ${user.email}`);
        } else {
            console.log(`✅ ${user.email} already hashed`);
        }
    }

    console.log('Done!');
}

hashPlainTextPasswords()
    .catch(console.error)
    .finally(() => prisma.$disconnect());