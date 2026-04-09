const { PrismaNeonHttp } = require('@prisma/adapter-neon');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

// Synchronously load env for initialization
if (!process.env.DATABASE_URL) {
    const envPath = path.resolve(__dirname, '../.env');
    require('dotenv').config({ path: envPath });
}

function buildPrismaClient(urlOverride) {
    // Prefer DIRECT_URL for the HTTP adapter (bypasses connection pooler)
    const rawUrl = urlOverride || process.env.DIRECT_URL || process.env.DATABASE_URL;
    let url = rawUrl;
    if (url) {
        url = url.replace(/^["']|["']$/g, '').trim();
        if (url.startsWith('postgresql://')) url = url.replace('postgresql://', 'postgres://');
    }

    if (!url) {
        throw new Error('DATABASE_URL is required');
    }

    const adapter = new PrismaNeonHttp(url);
    return new PrismaClient({ adapter });
}

let prisma;

try {
    console.log('[PRISMA] Initializing Neon HTTP adapter (Prisma 7)...');
    prisma = buildPrismaClient();
    console.log('[PRISMA] Client initialized successfully.');
} catch (err) {
    console.error('[PRISMA_FATAL] Client initialization error:', err.message);
    process.exit(1);
}

module.exports = prisma;
