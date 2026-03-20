const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const aiBusinessTrack = await prisma.track.findFirst({
        where: { name: { contains: 'AI Business' } }
    });

    if (!aiBusinessTrack) {
        console.log('AI Business track not found.');
        const allTracks = await prisma.track.findMany();
        console.log('All tracks:');
        allTracks.forEach(t => console.log(`- ${t.name} (ID: ${t.id})`));
        return;
    }

    const usersInTrack = await prisma.user.findMany({
        where: { trackId: aiBusinessTrack.id }
    });

    console.log(`Track: ${aiBusinessTrack.name} (ID: ${aiBusinessTrack.id})`);
    console.log(`Users assigned to this track: ${usersInTrack.length}`);
    for (const u of usersInTrack) {
        console.log(`- User: ${u.firstName} ${u.lastName} (ID: ${u.id})`);
    }
    
    // Check modules in this track
    const modules = await prisma.module.findMany({
        where: { trackId: aiBusinessTrack.id }
    });

    console.log(`Modules in this track: ${modules.length}`);
    for (const m of modules) {
        const enrollments = await prisma.enrollment.findMany({
            where: { moduleId: m.id }
        });
        console.log(`- Module: ${m.title} (${m.type}, Status: ${m.status}), Enrollments: ${enrollments.length}, Completed: ${enrollments.filter(e => e.completed).length}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
