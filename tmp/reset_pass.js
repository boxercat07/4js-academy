const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const p = new PrismaClient();

(async () => {
    try {
        const hash = await bcrypt.hash('password123', 10);
        await p.user.update({
            where: { email: 'jdoe@test.com' },
            data: { passwordHash: hash }
        });
        console.log('Password reset for jdoe@test.com');
    } catch (e) {
        console.error('Error resetting password:', e.message);
    } finally {
        await p.$disconnect();
    }
})();
