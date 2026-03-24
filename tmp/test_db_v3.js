const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Testing Prisma connection...');
    // Try bypassing pooler
    const originalUrl = process.env.DATABASE_URL;
    const url = originalUrl.replace('-pooler', '');
    console.log('Testing with direct URL (no pooler)...');
    console.log('URL starts with:', url.substring(0, 20) + '...');

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: url
            }
        }
    });
    try {
        const userCount = await prisma.user.count();
        console.log('Connection successful!');
        console.log('User count:', userCount);
    } catch (error) {
        console.error('Connection failed!');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        console.error('Full Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
