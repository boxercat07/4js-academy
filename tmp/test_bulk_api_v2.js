const http = require('http');

function request(options, body) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, body: JSON.parse(data) }));
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    try {
        console.log('Logging in...');
        const login = await request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            email: 'admin_test@academy.com',
            password: 'AdminPassword123!'
        });

        const token = login.body.token;
        if (!token) throw new Error('Login failed: ' + JSON.stringify(login.body));

        console.log('Testing bulk import...');
        const bulk = await request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/users/bulk',
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        }, {
            users: [
                { firstName: 'API_Test1', lastName: 'User', email: 'api_test1@4js.com', department: 'Sales', role: 'LEARNER' },
                { firstName: 'API_Test2', lastName: 'User', email: 'api_test2@4js.com', department: 'R&D', role: 'ADMIN' }
            ]
        });

        console.log('Bulk Import Result:', JSON.stringify(bulk.body, null, 2));
    } catch (err) {
        console.error('Error:', err);
    }
}

run();
