const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugProgress() {
    try {
        const userId = '4c5fefdf-51fb-442d-95b2-6e52e5d61a74'; 

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { 
                tracks: true,
                enrollments: { include: { module: true } } 
            }
        });

        if (!user) {
            console.log('USER_NOT_FOUND');
            return;
        }

        console.log(`User: ${user.firstName} ${user.lastName}`);
        console.log(`Assigned Tracks Count: ${user.tracks.length}`);

        const allTracks = await prisma.track.findMany({
            include: { modules: { where: { status: 'PUBLISHED' } } }
        });
        
        console.log(`All Tracks Count: ${allTracks.length}`);

        // 4. John Doe rule calculation
        const enrolledModuleIds = user.enrollments.map(e => e.moduleId);
        const enrolledTrackIds = new Set(user.tracks.map(t => t.id));
        
        // Also include tracks where the user has completed at least one module
        allTracks.filter(t => t.modules.some(m => enrolledModuleIds.includes(m.id))).forEach(t => enrolledTrackIds.add(t.id));

        console.log('Active Track IDs:', Array.from(enrolledTrackIds));

        let overallProgress = 0;
        if (enrolledTrackIds.size > 0) {
            let totalCompletedInActive = 0;
            let totalModulesInActive = 0;

            allTracks.forEach(track => {
                if (enrolledTrackIds.has(track.id)) {
                    totalModulesInActive += track.modules.length;
                    const trackModuleIds = track.modules.map(m => m.id);
                    const completedInTrack = user.enrollments.filter(e => e.completed && trackModuleIds.includes(e.moduleId)).length;
                    totalCompletedInActive += completedInTrack;
                    
                    console.log(`Track ${track.name}: ${completedInTrack} / ${track.modules.length}`);
                }
            });

            if (totalModulesInActive > 0) {
                overallProgress = Math.round((totalCompletedInActive / totalModulesInActive) * 100);
            }
        }

        console.log('Overall Progress Calculated:', overallProgress);

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

debugProgress();
