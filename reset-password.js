const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    const email = 'vincent.martinet@4js.com';
    const newPassword = 'password123';
    
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    
    const user = await prisma.user.update({
        where: { email },
        data: { passwordHash }
    });
    
    console.log(`Password for ${email} has been reset to: ${newPassword}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
