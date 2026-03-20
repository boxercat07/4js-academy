const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    console.log('--- DB TEST START ---');
    console.log('CWD:', process.cwd());
    const count = await prisma.user.count();
    console.log('User count:', count);
    console.log('--- DB TEST END ---');
  } catch (err) {
    console.log('--- ERROR START ---');
    console.error(err);
    console.log('--- ERROR END ---');
  } finally {
    await prisma.$disconnect();
  }
}

test();
