const fetch = require('node-fetch');

async function testCreateAdmin() {
    const payload = {
        firstName: 'Test',
        lastName: 'Admin',
        email: 'testadmin@example.com',
        password: 'password123',
        role: 'ADMIN',
        trackId: null
    };

    try {
        const response = await fetch('http://localhost:3000/api/users', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                // Need a token since it's protected
                'Cookie': 'token=...' // I don't have a token easily, maybe I can bypass verifyToken for testing?
            },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        console.log(data);
    } catch (err) {
        console.error(err);
    }
}
// ... actually I can't easily get a token.
