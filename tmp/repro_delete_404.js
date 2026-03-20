const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ai-academy-super-secret-key-for-dev';

async function run() {
    try {
        // 1. Get a user
        const user = await prisma.user.findFirst({ where: { email: 'jdoe@test.com' } });
        if (!user) {
            console.error('User not found');
            return;
        }

        // 2. Create a test notification
        const notif = await prisma.notification.create({
            data: {
                userId: user.id,
                type: 'TEST',
                title: 'Test Deletion',
                message: 'This will be deleted'
            }
        });
        console.log('Created test notification:', notif.id);

        // 3. Generate token
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);

        // 4. Try to delete via fetch
        const url = `http://localhost:3000/api/notifications/${notif.id}`;
        console.log('Attempting DELETE', url);

        const res = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Cookie': `token=${token}`
            }
        });

        console.log('Response Status:', res.status);
        console.log('Response Text:', await res.text());

        if (res.status === 404) {
            console.error('FAILED: GOT 404');
        } else {
            console.log('SUCCESS: Deletion request worked (or at least hit a route)');
        }

    } catch (err) {
        console.error('Diagnostic error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

run();
