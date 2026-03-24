const prisma = require('./server/prisma');

async function main() {
    try {
        await prisma.user.update({
            where: { email: 'vincent@4js.com' },
            data: { passwordHash: 'password' }
        });
        console.log('Password reset successful for vincent@4js.com');
    } catch (err) {
        console.error('Password reset failed:', err.message);
    }
}

main().finally(() => prisma.$disconnect());
