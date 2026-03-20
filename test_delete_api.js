const http = require('http');

// Since I don't have a valid JWT token for the test, 
// this WILL fail with 401 or 403.
// But I want to see IF it reaches my code or get blocked by middleware.

async function testDelete() {
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/users/some-fake-id',
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log('Status:', res.statusCode);
            console.log('Body:', data);
        });
    });

    req.on('error', (e) => console.error('Error:', e.message));
    req.end();
}

testDelete();
