require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function reset() {
  try {
    const salt = await bcrypt.genSalt(10);
    const h = await bcrypt.hash('admin123', salt);
    await prisma.user.update({
      where: { email: 'vincent.martinet@4js.com' },
      data: { passwordHash: h }
    });
    console.log('Password reset successfully to admin123');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
reset();
