const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tracks = await prisma.track.findMany();
  console.log('Tracks in database:', JSON.stringify(tracks, null, 2));
  
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' }
  });
  console.log('Admin users:', JSON.stringify(admins, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
