const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const trackName = "Genero Enterprise Fundamentals I - FR";
  const tracks = await prisma.track.findMany({
    where: {
      name: {
        contains: "Genero",
        mode: 'insensitive'
      }
    },
    include: {
      modules: true
    }
  });

  if (tracks.length === 0) {
    console.log("No tracks found containing 'Genero'.");
    return;
  }

  for (const track of tracks) {
    console.log(`\n=== Track: ${track.name} (ID: ${track.id}) ===`);
    console.log(`Status: ${track.status}`);
    console.log(`Modules: ${track.modules.length}`);

    const localModules = track.modules.filter(m => m.mediaUrl && m.mediaUrl.startsWith('local:'));
    if (localModules.length > 0) {
      console.log(`CRITICAL: Found ${localModules.length} modules using LOCAL references!`);
      localModules.forEach(m => {
        console.log(`  [LOCAL] ${m.title} -> ${m.mediaUrl}`);
      });
    } else {
      console.log("No local references found in this track.");
    }

    track.modules.slice(0, 5).forEach(m => {
        console.log(`  - ${m.title}: ${m.mediaUrl}`);
    });
    if (track.modules.length > 5) console.log("  ...");
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
