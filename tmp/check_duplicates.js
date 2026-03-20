const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tracks = await prisma.track.findMany();
  const names = tracks.map(t => t.name);
  const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
  
  console.log('Total tracks:', tracks.length);
  if (duplicates.length > 0) {
    console.log('Duplicate names found:', duplicates);
  } else {
    console.log('No duplicate names found.');
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
