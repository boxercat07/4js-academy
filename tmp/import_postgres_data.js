// Import exported SQLite data into PostgreSQL via Prisma
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importData() {
    try {
        const dataPath = path.join(__dirname, 'sqlite_export.json');
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

        console.log('=== Importing data into PostgreSQL ===\n');

        // 1. Import Users (without tracks relation, we'll link later)
        console.log(`Importing ${data.users.length} users...`);
        for (const user of data.users) {
            await prisma.user.create({
                data: {
                    id: user.id,
                    email: user.email,
                    passwordHash: user.passwordHash,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    department: user.department,
                    createdAt: new Date(user.createdAt),
                    updatedAt: new Date(user.updatedAt)
                }
            });
        }
        console.log('  ✓ Users imported');

        // 2. Import Tracks
        console.log(`Importing ${data.tracks.length} tracks...`);
        for (const track of data.tracks) {
            await prisma.track.create({
                data: {
                    id: track.id,
                    name: track.name,
                    slug: track.slug,
                    description: track.description,
                    icon: track.icon,
                    targetDepartments: track.targetDepartments,
                    status: track.status,
                    curriculumDraft: track.curriculumDraft,
                    createdAt: new Date(track.createdAt),
                    updatedAt: new Date(track.updatedAt)
                }
            });
        }
        console.log('  ✓ Tracks imported');

        // 3. Import Modules
        console.log(`Importing ${data.modules.length} modules...`);
        for (const mod of data.modules) {
            await prisma.module.create({
                data: {
                    id: mod.id,
                    title: mod.title,
                    description: mod.description,
                    trackId: mod.trackId,
                    duration: mod.duration,
                    type: mod.type,
                    mediaUrl: mod.mediaUrl,
                    fileId: mod.fileId,
                    status: mod.status,
                    order: mod.order,
                    createdAt: new Date(mod.createdAt),
                    updatedAt: new Date(mod.updatedAt)
                }
            });
        }
        console.log('  ✓ Modules imported');

        // 4. Import Enrollments
        console.log(`Importing ${data.enrollments.length} enrollments...`);
        for (const enr of data.enrollments) {
            await prisma.enrollment.create({
                data: {
                    id: enr.id,
                    userId: enr.userId,
                    moduleId: enr.moduleId,
                    progress: enr.progress,
                    completed: enr.completed,
                    attempts: enr.attempts,
                    lastScore: enr.lastScore,
                    createdAt: new Date(enr.createdAt),
                    updatedAt: new Date(enr.updatedAt)
                }
            });
        }
        console.log('  ✓ Enrollments imported');

        // 5. Link User-Track relations (many-to-many)
        console.log(`Linking ${data.userTrackRelations.length} user-track relations...`);
        for (const rel of data.userTrackRelations) {
            await prisma.user.update({
                where: { id: rel.userId },
                data: {
                    tracks: {
                        connect: { id: rel.trackId }
                    }
                }
            });
        }
        console.log('  ✓ User-Track relations linked');

        // Verify
        const userCount = await prisma.user.count();
        const trackCount = await prisma.track.count();
        const moduleCount = await prisma.module.count();
        const enrollmentCount = await prisma.enrollment.count();

        console.log('\n=== Import Summary ===');
        console.log(`Users:       ${userCount}`);
        console.log(`Tracks:      ${trackCount}`);
        console.log(`Modules:     ${moduleCount}`);
        console.log(`Enrollments: ${enrollmentCount}`);
        console.log('\n✓ Import complete!');

    } catch (error) {
        console.error('Import failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

importData();
