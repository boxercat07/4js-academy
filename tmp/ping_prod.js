const https = require('https');

function fetchUrl(url, method = 'GET', headers = {}) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, { method, headers }, res => {
            let data = '';
            res.on('data', chunk => (data += chunk));
            res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', reject);
        req.end();
    });
}

async function run() {
    let token = '';
    try {
        // Authenticate as info@fourjs.com (or similar) to get a token, but we might not need it if stats are public?
        // Wait, stats endpoint has verifyToken!
        // We need a valid token. Let's ask the local API or just do a POST to login if we know a password.
        // Let's just login as the user we created earlier
        console.log('Logging in...');
        const loginReq = await new Promise((resolve, reject) => {
            const req = https.request(
                'https://fourjs-academy.onrender.com/api/auth/login',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                },
                res => {
                    let data = '';
                    res.on('data', chunk => (data += chunk));
                    res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }));
                }
            );
            req.on('error', reject);
            req.write(JSON.stringify({ email: 'info@fourjs.com', password: 'password123' })); // typical default
            req.end();
        });

        let cookies = loginReq.headers['set-cookie'];
        if (cookies) {
            token = cookies[0].split(';')[0];
            console.log('Logged in successfully.');
        } else {
            console.log('Login failed, no cookie:', loginReq.data);
            return;
        }

        console.log('\\nFetching ratings stats...');
        const statsRes = await fetchUrl(
            'https://fourjs-academy.onrender.com/api/ratings/ff9792ba-3528-4b9b-a43e-5d7ebffcbcde/stats',
            'GET',
            {
                Cookie: token
            }
        );
        console.log(`Stats Response: ${statsRes.status} - ${statsRes.data}`);
    } catch (e) {
        console.error(e);
    }
}
run();
