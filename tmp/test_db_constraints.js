const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDbConstraint() {
  console.log('Testing DB level unique constraint for name...');
  
  // 1. Get an existing track name
  const track = await prisma.track.findFirst();
  if (!track) {
    console.log('No tracks found to test against.');
    return;
  }

  console.log(`Found existing track: "${track.name}"`);

  // 2. Try to create another track with the same name
  try {
    await prisma.track.create({
      data: {
        name: track.name,
        slug: 'some-unique-slug-' + Math.random(),
        status: 'DRAFT'
      }
    });
    console.log('CRITICAL ERROR: DB allowed duplicate name!');
  } catch (err) {
    console.log('SUCCESS: DB blocked duplicate name.');
    console.log('Error code:', err.code); // Should be P2002 for Prisma unique constraint
  }

  // 3. Try to create another track with the same slug
  console.log(`\nTesting DB level unique constraint for slug: "${track.slug}"...`);
  try {
    await prisma.track.create({
      data: {
        name: 'Completely Unique Name ' + Math.random(),
        slug: track.slug,
        status: 'DRAFT'
      }
    });
    console.log('CRITICAL ERROR: DB allowed duplicate slug!');
  } catch (err) {
    console.log('SUCCESS: DB blocked duplicate slug.');
    console.log('Error code:', err.code);
  }
}

testDbConstraint()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
