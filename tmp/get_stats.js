
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tracks = await prisma.track.findMany({
    where: { status: 'PUBLISHED' },
    select: {
      name: true,
      targetDepartments: true,
      createdAt: true
    }
  });

  const stats = {};
  tracks.forEach(t => {
    const departments = t.targetDepartments ? t.targetDepartments.split(',').map(d => d.trim()) : ['All'];
    departments.forEach(dept => {
      stats[dept] = (stats[dept] || 0) + 1;
    });
  });

  console.log('--- Tracks Stats ---');
  console.log('Total Published Tracks:', tracks.length);
  console.log('Stats by Department:', JSON.stringify(stats, null, 2));
  
  const newerTracks = tracks
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 3)
    .map(t => t.name);
    
  console.log('Latest Tracks:', newerTracks);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
