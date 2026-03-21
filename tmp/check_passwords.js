require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: { id: true, firstName: true, lastName: true, email: true, passwordHash: true }
    });

    console.log(`Total users: ${users.length}\n`);

    let broken = 0;
    for (const u of users) {
        const isBcrypt = u.passwordHash && u.passwordHash.startsWith('$2');
        if (!isBcrypt) {
            console.log(`⚠️  INVALID HASH: ${u.firstName} ${u.lastName} (${u.email}) - hash: "${u.passwordHash?.substring(0, 30)}..."`);
            broken++;
        }
    }

    if (broken === 0) {
        console.log('✅ All user passwords are properly hashed with bcrypt.');
    } else {
        console.log(`\n❌ ${broken} user(s) have broken password hashes.`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
