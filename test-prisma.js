require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function test() {
    try {
        const prisma = new PrismaClient();
        const users = await prisma.user.findMany();
        console.log("Success! Users count:", users.length);
        await prisma.$disconnect();
    } catch (e) {
        console.error("Failed:", e);
    }
}
test();
