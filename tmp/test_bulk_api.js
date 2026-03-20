const fetch = require('node-fetch');

async function testBulkImport() {
    const url = 'http://localhost:3000/api/users/bulk';
    const loginUrl = 'http://localhost:3000/api/auth/login';
    
    // Login first to get token
    const loginResp = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'admin_test@academy.com',
            password: 'AdminPassword123!'
        })
    });
    
    const { token } = await loginResp.json();

    const users = [
        { firstName: 'Test1', lastName: 'User', email: 'test1@4js.com', department: 'Sales', role: 'LEARNER' },
        { firstName: 'Test2', lastName: 'User', email: 'test2@4js.com', department: 'R&D', role: 'ADMIN' }
    ];

    const response = await fetch(url, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ users })
    });

    const result = await response.json();
    console.log('Bulk Import Result:', JSON.stringify(result, null, 2));
}

testBulkImport();
