const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
    try {
        const track = await prisma.track.findFirst({
            where: { name: { contains: 'AI Engineering' } }
        });

        console.log(`Checking notifications for track: ${track.name}`);

        const targetDepts = track.targetDepartments ? track.targetDepartments.split(',').map(d => d.trim()) : [];
        const isGlobal = targetDepts.length === 0 || targetDepts.some(d => d.toLowerCase() === 'all' || d.toLowerCase() === 'other');

        console.log(`isGlobal: ${isGlobal}, targetDepts: ${JSON.stringify(targetDepts)}`);

        let userWhere;
        if (isGlobal) {
            userWhere = { role: 'LEARNER' };
        } else {
            userWhere = {
                role: 'LEARNER',
                OR: [
                    { tracks: { some: { id: track.id } } },
                    { department: { in: targetDepts } }
               ]
            };
        }

        const usersToNotify = await prisma.user.findMany({
            where: userWhere,
            select: { id: true, email: true, department: true }
        });

        console.log(`Users to notify: ${usersToNotify.length}`);
        const jdoe = usersToNotify.find(u => u.email === 'jdoe@test.com');
        if (jdoe) {
            console.log(`SUCCESS: John Doe (id: ${jdoe.id}) is in the list!`);
        } else {
            console.log(`FAILURE: John Doe is NOT in the list.`);
            console.log('List of users:', JSON.stringify(usersToNotify, null, 2));
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
})();
