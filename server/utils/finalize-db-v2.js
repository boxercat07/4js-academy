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

        // Use tagged template literals here
        await sql`
            CREATE TABLE IF NOT EXISTS "Rating" (
                "id" TEXT PRIMARY KEY,
                "userId" TEXT NOT NULL,
                "trackId" TEXT NOT NULL,
                "stars" INTEGER NOT NULL,
                "comment" TEXT,
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `;
        console.log('Table created.');

        try {
            // Need to specify the table and columns for indices
            await sql`CREATE UNIQUE INDEX IF NOT EXISTS "Rating_userId_trackId_key" ON "Rating"("userId", "trackId")`;
            await sql`CREATE INDEX IF NOT EXISTS "Rating_trackId_idx" ON "Rating"("trackId")`;
            await sql`CREATE INDEX IF NOT EXISTS "Rating_userId_idx" ON "Rating"("userId")`;
            console.log('Indices created.');

            // Add foreign keys if possible (Postgres syntax)
            // Note: If they already exist, this might fail, but that's okay.
            try {
                await sql`ALTER TABLE "Rating" ADD CONSTRAINT "Rating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`;
                await sql`ALTER TABLE "Rating" ADD CONSTRAINT "Rating_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE`;
                console.log('Foreign keys added.');
            } catch (e) {
                console.log('Foreign keys might already exist.');
            }
        } catch (e) {
            console.log('Warning: Indices/FKs failed:', e.message);
        }

        console.log('Database initialization complete!');
    } catch (err) {
        console.error('Initialization failed:', err.message);
        process.exit(1);
    }
}

initDb();
