const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const http = require('http');

async function simulateFetch() {
    const tracks = await prisma.track.findMany();
    if (tracks.length === 0) {
        console.log('No tracks to test.');
        return;
    }
    const track = tracks[0];
    console.log('Simulating update for:', track.id);

    const payload = JSON.stringify({
        name: track.name + ' (Updated)',
        description: track.description,
        status: track.status,
        icon: 'rocket'
    });

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: `/api/tracks/${track.id}`,
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': payload.length
        }
    };

    const req = http.request(options, (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            console.log(`BODY: ${chunk}`);
        });
    });

    req.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
    });

    req.write(payload);
    req.end();
}

simulateFetch().finally(() => prisma.$disconnect());
