const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs'); // Assuming bcryptjs is used, let's try bcrypt if it fails

const prisma = new PrismaClient();

async function resetPassword() {
    try {
        const email = 'vincent.martinet@4js.com';
        const newPassword = 'admin';

        let bcryptLib;
        try {
            bcryptLib = require('bcrypt');
        } catch(e) {
            bcryptLib = require('bcryptjs');
        }

        const salt = await bcryptLib.genSalt(10);
        const hashedPassword = await bcryptLib.hash(newPassword, salt);

        const user = await prisma.user.update({
            where: { email },
            data: { password: hashedPassword }
        });

        console.log(`Successfully reset password for ${user.email} to '${newPassword}'`);
    } catch (e) {
        console.error('Error resetting password:', e);
    } finally {
        await prisma.$disconnect();
    }
}

resetPassword();
