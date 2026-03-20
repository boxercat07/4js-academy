const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function listEverything() {
    let output = '';
    const log = (msg) => { output += msg + '\n'; console.log(msg); };

    try {
        const users = await prisma.user.findMany();
        log('--- USERS ---');
        users.forEach(u => log(`${u.firstName} ${u.lastName} (${u.email}) - Dept: ${u.department}`));

        const tracks = await prisma.track.findMany({ include: { modules: true } });
        log('\n--- TRACKS & MODULES ---');
        tracks.forEach(t => {
            log(`[${t.status}] Track: ${t.name} (ID: ${t.id}, Depts: ${t.targetDepartments})`);
            t.modules.forEach(m => {
                log(`  - [${m.status}] ${m.title} (Type: ${m.type}, Group: ${m.description}, ID: ${m.id})`);
            });
        });

        const enrollments = await prisma.enrollment.findMany({ include: { user: true, module: true } });
        log('\n--- ENROLLMENTS ---');
        enrollments.forEach(e => {
            log(`${e.user.firstName} -> ${e.module.title}: ${e.progress}% (Completed: ${e.completed})`);
        });

        fs.writeFileSync('tmp/result_final.txt', output, 'utf8');

    } catch (e) {
        console.error(e);
        fs.writeFileSync('tmp/result_final.txt', 'ERROR: ' + e.message, 'utf8');
    } finally {
        await prisma.$disconnect();
    }
}

listEverything();
