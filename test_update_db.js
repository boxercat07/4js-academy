const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testUpdate() {
  try {
    const track = await prisma.track.findFirst({ where: { name: { contains: 'Technical' } } });
    if (!track) {
        console.log('No Tech track found');
        return;
    }
    console.log('Target track ID:', track.id);
    console.log('Current icon:', track.icon);

    const payload = {
        name: track.name,
        description: track.description,
        status: track.status,
        icon: 'rocket' // Test change
    };

    console.log('Applying update...');
    const result = await prisma.track.update({
        where: { id: track.id },
        data: payload
    });

    console.log('Update result:', result);
    
    const verify = await prisma.track.findUnique({ where: { id: track.id } });
    console.log('Verification from DB:', verify.icon);

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testUpdate();
