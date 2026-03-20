const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Adding fileId column to Module table...');
        await prisma.$executeRawUnsafe('ALTER TABLE "Module" ADD COLUMN "fileId" TEXT;');
        console.log('Success!');
    } catch (e) {
        if (e.message.includes('duplicate column name')) {
            console.log('Column already exists.');
        } else {
            console.error('Error:', e);
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
