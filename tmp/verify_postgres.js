// Quick verification that the PostgreSQL connection works and data is accessible
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
    try {
        console.log('=== PostgreSQL Connection Verification ===\n');
        
        const users = await prisma.user.findMany({ select: { id: true, email: true, role: true, firstName: true, lastName: true } });
        console.log(`Users (${users.length}):`);
        users.forEach(u => console.log(`  - ${u.firstName} ${u.lastName} (${u.email}) [${u.role}]`));
        
        const tracks = await prisma.track.findMany({ select: { id: true, name: true, status: true } });
        console.log(`\nTracks (${tracks.length}):`);
        tracks.forEach(t => console.log(`  - ${t.name} [${t.status}]`));
        
        const modules = await prisma.module.count();
        const enrollments = await prisma.enrollment.count();
        console.log(`\nModules: ${modules}`);
        console.log(`Enrollments: ${enrollments}`);
        
        console.log('\n✓ PostgreSQL connection verified successfully!');
    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verify();
