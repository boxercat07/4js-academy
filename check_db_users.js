const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const users = await prisma.user.findMany({ select: { email: true, passwordHash: true, role: true } });
    console.log('Users found:', users.length);
    users.forEach(u => {
      console.log('Email:', u.email, 'Role:', u.role, 'PasswordHash starts with $:', u.passwordHash.startsWith('$'));
    });
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();