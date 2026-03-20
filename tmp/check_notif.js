const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const fs = require('fs');

(async () => {
    try {
        // Check latest NEW_TRACK notifications
        const notifs = await p.notification.findMany({
            where: { type: 'NEW_TRACK' },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: { user: { select: { email: true, firstName: true, lastName: true } } }
        });

        // Check AI Engineering track status
        const aiTrack = await p.track.findFirst({
            where: { name: { contains: 'AI Engineering' } },
            select: { id: true, name: true, status: true, targetDepartments: true, updatedAt: true }
        });

        // Check jdoe user
        const jdoe = await p.user.findFirst({
            where: { email: 'jdoe@test.com' },
            select: { id: true, email: true, firstName: true, lastName: true, department: true, role: true }
        });

        let output = 'AI Engineering Track:\n' + JSON.stringify(aiTrack, null, 2) + '\n\n';
        output += 'jdoe@test.com user:\n' + JSON.stringify(jdoe, null, 2) + '\n\n';
        output += 'Latest NEW_TRACK notifications:\n' + JSON.stringify(notifs.map(n => ({
            userId: n.userId,
            userEmail: n.user.email,
            userName: n.user.firstName + ' ' + n.user.lastName,
            message: n.message,
            createdAt: n.createdAt
        })), null, 2) + '\n';

        fs.writeFileSync('tmp/notif_debug.txt', output);
        console.log('Written to tmp/notif_debug.txt');
    } catch(e) {
        console.error(e);
    } finally {
        await p.$disconnect();
    }
})();
