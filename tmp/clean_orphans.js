const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const UPLOADS_DIR = path.join(__dirname, '../server/uploads');

async function cleanOrphans() {
    console.log('--- STARTING ORPHAN FILE CLEANUP ---');
    try {
        // 1. Get all files in uploads directory
        if (!fs.existsSync(UPLOADS_DIR)) {
            console.log('Uploads directory does not exist. Skipping.');
            return;
        }

        const filesOnDisk = fs.readdirSync(UPLOADS_DIR);
        console.log(`Found ${filesOnDisk.length} files in ${UPLOADS_DIR}`);

        // 2. Get all mediaUrls from database
        const modules = await prisma.module.findMany({
            select: { mediaUrl: true }
        });
        
        const referencedFiles = new Set();
        modules.forEach(m => {
            if (m.mediaUrl && m.mediaUrl.includes('/uploads/')) {
                const filename = m.mediaUrl.split('/uploads/').pop();
                if (filename) referencedFiles.add(filename);
            }
        });

        console.log(`Found ${referencedFiles.size} unique referenced files in database.`);

        // 3. Identify and delete orphans
        let deletedCount = 0;
        for (const file of filesOnDisk) {
            if (!referencedFiles.has(file)) {
                const fullPath = path.join(UPLOADS_DIR, file);
                console.log(`[ORPHAN] Deleting: ${file}`);
                fs.unlinkSync(fullPath);
                deletedCount++;
            }
        }

        console.log(`--- CLEANUP FINISHED. Deleted ${deletedCount} orphan(s). ---`);
    } catch (error) {
        console.error('Cleanup failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanOrphans();
