
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tracks = await prisma.track.findMany({
    where: { status: 'PUBLISHED' },
    include: { modules: { where: { status: 'PUBLISHED' } } }
  });

  const summary = tracks.map(t => ({
    name: t.name,
    depts: t.targetDepartments,
    moduleCount: t.modules.length,
    createdAt: t.createdAt
  }));

  console.log(JSON.stringify(summary, null, 2));
}

main().finally(() => prisma.$disconnect());
