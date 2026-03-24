const { neon } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function initDb() {
    let url = process.env.DATABASE_URL;
    if (url) {
        url = url.replace(/^["']|["']$/g, '').trim();
        if (url.startsWith('postgresql://')) url = url.replace('postgresql://', 'postgres://');
    }

    if (!url) {
        console.error('DATABASE_URL is missing.');
        process.exit(1);
    }

    const sql = neon(url);

    console.log('Attempting to initialize Rating table...');

    try {
        // Step 1: Create Table
        await sql`
            CREATE TABLE IF NOT EXISTS "Rating" (
                "id" TEXT PRIMARY KEY,
                "userId" TEXT NOT NULL,
                "trackId" TEXT NOT NULL,
                "stars" INTEGER NOT NULL,
                "comment" TEXT,
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "Rating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "Rating_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
        `;
        console.log('Table created or already exists.');

        // Step 2: Create Unique Index
        await sql`CREATE UNIQUE INDEX IF NOT EXISTS "Rating_userId_trackId_key" ON "Rating"("userId", "trackId")`;
        console.log('Unique index created.');

        // Step 3: Create Track Index
        await sql`CREATE INDEX IF NOT EXISTS "Rating_trackId_idx" ON "Rating"("trackId")`;
        console.log('Track index created.');

        // Step 4: Create User Index
        await sql`CREATE INDEX IF NOT EXISTS "Rating_userId_idx" ON "Rating"("userId")`;
        console.log('User index created.');

        console.log('Rating table initialized successfully.');
    } catch (err) {
        console.error('Error during initialization:', err);
        process.exit(1);
    }
}

initDb();
