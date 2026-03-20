const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
    try {
        console.log('Cleaning up test users...');
        await prisma.user.deleteMany({
            where: {
                OR: [
                    { email: 'admin_test@academy.com' },
                    { email: 'api_test1@4js.com' },
                    { email: 'api_test2@4js.com' },
                    { email: 'jean.dupont@fourjs.com' },
                    { email: 'marie.curie@fourjs.com' },
                    { email: 'pierre.garnier@fourjs.com' }
                ]
            }
        });
        console.log('Cleanup complete.');
    } catch (error) {
        console.error('Cleanup error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanup();
