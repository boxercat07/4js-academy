const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-');   // Replace multiple - with single -
}

async function main() {
  const tracks = await prisma.track.findMany();
  for (const track of tracks) {
    if (!track.slug) {
      const slug = slugify(track.name);
      await prisma.track.update({
        where: { id: track.id },
        data: { slug }
      });
      console.log(`Updated track "${track.name}" with slug "${slug}"`);
    }
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
