const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findJohn() {
    try {
        const user = await prisma.user.findFirst({
            where: { firstName: 'John', lastName: 'Doe' }
        });
        if (user) {
            console.log(`FOUND_ID:${user.id}:ID_END`);
        } else {
            console.log('NOT_FOUND');
        }
    } finally {
        await prisma.$disconnect();
    }
}
findJohn();
