const prisma = require('../prisma');

async function initDb() {
    console.log('Initializing Rating table via Prisma...');

    try {
        // Step 1: Create Table
        await prisma.$executeRawUnsafe(`
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
        `);
        console.log('Table created or already exists.');

        // Step 2: Create Unique Index
        await prisma.$executeRawUnsafe(
            `CREATE UNIQUE INDEX IF NOT EXISTS "Rating_userId_trackId_key" ON "Rating"("userId", "trackId")`
        );
        console.log('Unique index created.');

        // Step 3: Create Track Index
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Rating_trackId_idx" ON "Rating"("trackId")`);
        console.log('Track index created.');

        // Step 4: Create User Index
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Rating_userId_idx" ON "Rating"("userId")`);
        console.log('User index created.');

        console.log('Rating table initialized successfully.');
    } catch (err) {
        console.error('Error during initialization:', err);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

initDb();
