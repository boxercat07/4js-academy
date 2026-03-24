const { PrismaNeonHTTP } = require('@prisma/adapter-neon');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

// Synchronously load env for initialization
if (!process.env.DATABASE_URL) {
    const envPath = path.resolve(__dirname, '../.env');
    require('dotenv').config({ path: envPath });
}

let prisma;

if (process.env.NODE_ENV === 'test') {
    prisma = new PrismaClient();
} else {
    let url = process.env.DATABASE_URL;
    if (url) {
        url = url.replace(/^["']|["']$/g, '').trim();
        if (url.startsWith('postgresql://')) url = url.replace('postgresql://', 'postgres://');
    }

    if (!url) {
        console.error('[PRISMA_FATAL] DATABASE_URL is missing.');
        prisma = new PrismaClient();
    } else {
        try {
            const adapter = new PrismaNeonHTTP(url);
            prisma = new PrismaClient({ adapter });
        } catch (err) {
            console.error('[PRISMA_FATAL] Driver initialization error:', err.message);
            prisma = new PrismaClient();
        }
    }
}

module.exports = prisma;
