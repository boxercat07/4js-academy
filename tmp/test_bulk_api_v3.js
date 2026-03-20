const http = require('http');

function request(options, body) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                let parsedData = {};
                try {
                    parsedData = data ? JSON.parse(data) : {};
                } catch (e) {
                    console.log('Failed to parse response body as JSON:', data);
                }
                resolve({ 
                    statusCode: res.statusCode, 
                    body: parsedData, 
                    headers: res.headers 
                });
            });
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

        if (login.statusCode !== 200) {
            throw new Error('Login failed (' + login.statusCode + '): ' + JSON.stringify(login.body));
        }

        const setCookie = login.headers['set-cookie'];
        if (!setCookie) throw new Error('No cookie received');
        
        const tokenCookie = setCookie.find(c => c.startsWith('token='));
        if (!tokenCookie) throw new Error('Token cookie not found');

        console.log('Testing bulk import with cookie...');
        const bulk = await request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/users/bulk',
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Cookie': tokenCookie.split(';')[0]
            }
        }, {
            users: [
                { firstName: 'API_Test1', lastName: 'User', email: 'api_test1@4js.com', department: 'Sales', role: 'LEARNER' },
                { firstName: 'API_Test2', lastName: 'User', email: 'api_test2@4js.com', department: 'R&D', role: 'ADMIN' }
            ]
        });

        console.log('Bulk Import Status:', bulk.statusCode);
        console.log('Bulk Import Result:', JSON.stringify(bulk.body, null, 2));
    } catch (err) {
        console.error('Error:', err);
    }
}

run();
