const { neon } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function testConn() {
    let url = process.env.DATABASE_URL;
    if (url) {
        url = url.replace(/^["']|["']$/g, '').trim();
        if (url.startsWith('postgresql://')) url = url.replace('postgresql://', 'postgres://');
    }

    console.log('Testing connection to:', url.substring(0, 30) + '...');
    const sql = neon(url);

    try {
        const result = await sql`SELECT 1 as test`;
        console.log('Connection successful:', result);

        console.log('Creating Rating table...');
        await sql`
            CREATE TABLE IF NOT EXISTS "Rating" (
                "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
                "userId" TEXT NOT NULL,
                "trackId" TEXT NOT NULL,
                "stars" INTEGER NOT NULL,
                "comment" TEXT,
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await sql`CREATE UNIQUE INDEX IF NOT EXISTS "Rating_userId_trackId_key" ON "Rating"("userId", "trackId")`;
        console.log('Table and indices ready.');
    } catch (err) {
        console.error('Connection failed:', err);
    }
}

testConn();
