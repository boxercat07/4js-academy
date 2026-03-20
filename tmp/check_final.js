const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const fs = require('fs');

(async () => {
    try {
        // 1. Find the track
        const track = await p.track.findFirst({
            where: { name: { contains: 'AI Engineering' } },
            select: { id: true, name: true, status: true, targetDepartments: true }
        });

        // 2. Find John Doe
        const jdoe = await p.user.findFirst({
            where: { email: 'jdoe@test.com' },
            select: { id: true, email: true, department: true }
        });

        // 3. Count existing notifications for John Doe for this track
        const notifCount = await p.notification.count({
            where: {
                userId: jdoe.id,
                message: { contains: track.name }
            }
        });

        const output = {
            track,
            jdoe,
            notifCount
        };

        fs.writeFileSync('tmp/final_check.txt', JSON.stringify(output, null, 2));
        console.log('done');
    } catch(e) {
        console.error(e);
    } finally {
        await p.$disconnect();
    }
})();
