const prisma = require('../server/prisma');
const bcrypt = require('bcrypt');

async function testUpdate() {
    try {
        console.log('Fetching a user...');
        const user = await prisma.user.findFirst();
        if (!user) {
            console.log('No user found to test with.');
            return;
        }

        console.log(`Testing update for user: ${user.email} (${user.id})`);

        const id = user.id;
        const payload = {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            trackIds: [],
            department: user.department,
            password: 'NewStrongPassword123!'
        };

        const { firstName, lastName, email, trackIds, role, department, password } = payload;

        let passwordHash = undefined;
        if (password) {
            console.log('Hashing password...');
            const salt = await bcrypt.genSalt(10);
            passwordHash = await bcrypt.hash(password, salt);
        }

        console.log('Fetching oldUser...');
        const oldUser = await prisma.user.findUnique({
            where: { id },
            include: { tracks: { select: { id: true } } }
        });

        console.log('Executing update...');
        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                firstName,
                lastName,
                email,
                role,
                passwordHash,
                tracks:
                    trackIds && Array.isArray(trackIds)
                        ? {
                              set: trackIds.map(id => ({ id }))
                          }
                        : undefined,
                department: department
            }
        });

        console.log('Update successful!');

        // Test notification logic
        if (updatedUser.role === 'LEARNER' && trackIds && Array.isArray(trackIds)) {
            console.log('Testing notification logic...');
            const oldTrackIds = oldUser.tracks.map(t => t.id);
            const newTrackIds = trackIds.filter(id => !oldTrackIds.includes(id));

            if (newTrackIds.length > 0) {
                const tracks = await prisma.track.findMany({
                    where: { id: { in: newTrackIds }, status: 'PUBLISHED' }
                });

                if (tracks.length > 0) {
                    console.log(`Creating ${tracks.length} notifications...`);
                    // We won't actually create many to avoid polluting DB
                }
            }
        }
    } catch (error) {
        console.error('Update FAILED with error:');
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

testUpdate();
