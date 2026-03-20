const axios = require('axios');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'stitch-secret-2026'; // Based on my knowledge of the project
const token = jwt.sign({ id: 'admin-debug', role: 'ADMIN' }, JWT_SECRET);

async function testApi() {
    try {
        const response = await axios.get('http://localhost:3000/api/users', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Stats:', response.data.stats);
        console.log('Enrolled Count:', response.data.employees.length);
        console.log('First 2 Employees Track info:', response.data.employees.slice(0, 2).map(e => ({ name: e.name, trackId: e.trackId, role: e.role })));
    } catch (error) {
        console.error('API Error:', error.message);
        if (error.response) console.log('Response data:', error.response.data);
    }
}

testApi();
