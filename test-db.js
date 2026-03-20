const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    console.log('Testing database connection...');
    const userCount = await prisma.user.count();
    console.log('User count:', userCount);
    
    const firstUser = await prisma.user.findFirst({ include: { track: true } });
    console.log('First user:', firstUser ? firstUser.email : 'None');
    
    console.log('Test successful');
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
