const { neon } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function initDb() {
    let url = process.env.DATABASE_URL;
    if (url) {
        url = url.replace(/^["']|["']$/g, '').trim();
        if (url.startsWith('postgresql://')) url = url.replace('postgresql://', 'postgres://');
    }

    const sql = neon(url);

    try {
        console.log('Finalizing Rating table creation...');

        // Single call with multiple statements separated by semicolon might fail in some drivers,
        // but let's try a single robust CREATE TABLE first.
        await sql(`
            CREATE TABLE IF NOT EXISTS "Rating" (
                "id" TEXT PRIMARY KEY,
                "userId" TEXT NOT NULL,
                "trackId" TEXT NOT NULL,
                "stars" INTEGER NOT NULL,
                "comment" TEXT,
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Table created.');

        try {
            await sql(`CREATE UNIQUE INDEX IF NOT EXISTS "Rating_userId_trackId_key" ON "Rating"("userId", "trackId")`);
            await sql(`CREATE INDEX IF NOT EXISTS "Rating_trackId_idx" ON "Rating"("trackId")`);
            await sql(`CREATE INDEX IF NOT EXISTS "Rating_userId_idx" ON "Rating"("userId")`);
            console.log('Indices created.');
        } catch (e) {
            console.log('Warning: Indices might already exist or failed:', e.message);
        }

        console.log('Ready!');
    } catch (err) {
        console.error('Initialization failed:', err.message);
        process.exit(1);
    }
}

initDb();
