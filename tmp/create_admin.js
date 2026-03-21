const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    const email = 'vincent.martinet@volarisgroup.com';
    const password = 'admin123';
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            passwordHash,
            role: 'ADMIN'
        },
        create: {
            email,
            passwordHash,
            firstName: 'Vincent',
            lastName: 'Martinet',
            role: 'ADMIN',
            department: 'IT'
        }
    });

    console.log('Admin user ensured:', user.email);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
