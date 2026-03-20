const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assign() {
    try {
        const user = await prisma.user.findFirst({
            where: { firstName: 'John' }
        });
        const track = await prisma.track.findFirst({
            where: { name: 'AI Business Track' }
        });

        if (user && track) {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    tracks: {
                        connect: { id: track.id }
                    }
                }
            });
            console.log('✅ Assigned John Doe to AI Business Track');
        } else {
            console.log('❌ User or Track not found');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

assign();
