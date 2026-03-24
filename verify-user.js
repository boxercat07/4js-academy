const prisma = require('./server/prisma');

async function main() {
    const email = 'vincent@4js.com';
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            console.log('User not found:', email);
        } else {
            console.log('User found:', email);
            console.log('Role:', user.role);
            console.log('Password hash:', user.passwordHash);
            const isHashed = user.passwordHash.startsWith('$');
            console.log('Is hashed:', isHashed);
        }
    } catch (err) {
        console.error('Prisma query error:', err.message);
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
