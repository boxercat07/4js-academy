const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const trackName = "Genero Enterprise Fundamentals I - FR";
  const track = await prisma.track.findFirst({
    where: {
      name: {
        contains: "Genero Enterprise Fundamentals",
        mode: 'insensitive'
      }
    },
    include: {
      modules: true
    }
  });

  if (!track) {
    console.log("Track not found.");
    return;
  }

  console.log(`Track Found: ${track.name} (ID: ${track.id})`);
  console.log(`Status: ${track.status}`);
  console.log(`Modules count: ${track.modules.length}`);

  track.modules.forEach(m => {
    console.log(`- Module: ${m.title}`);
    console.log(`  Type: ${m.type}`);
    console.log(`  MediaURL: ${m.mediaUrl}`);
    console.log(`  FileID: ${m.fileId}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
