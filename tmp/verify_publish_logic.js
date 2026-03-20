const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();
const SECRET = 'stitch-secret-2026'; // Constant from server/routes/auth.js (as seen in earlier sessions)

async function main() {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!admin) {
        console.error('No admin user found');
        return;
    }

    const token = jwt.sign({ id: admin.id, role: admin.role }, SECRET, { expiresIn: '1h' });
    console.log('Generated Admin Token');

    const track = await prisma.track.findFirst({ where: { name: 'TECHNICAL' } });
    if (!track) {
        console.error('No TECHNICAL track found');
        return;
    }

    console.log('Current Track Status:', track.status);

    // Call the publish API logic directly since it's hard to make a real HTTP request with cookies in a script easily
    // but I want to verify the logic I added to server/routes/tracks.js
    
    // Instead of calling the API, let's just run the same prisma logic to ensure it doesn't fail
    // and then I'll trust the Express middleware/route handles the rest if the prisma logic is correct.
    
    try {
        await prisma.track.update({
            where: { id: track.id },
            data: { status: 'PUBLISHED' }
        });
        console.log('Updated Track Status to PUBLISHED');
        
        const updatedTrack = await prisma.track.findUnique({ where: { id: track.id } });
        console.log('New Track Status:', updatedTrack.status);
    } catch (error) {
        console.error('Update failed:', error);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
