const fetch = require('node-fetch');

async function testBulkDelete() {
    const ids = ['some-id-that-probably-exists-or-not'];
    const response = await fetch('http://localhost:3000/api/users/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
    });
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
}

// Note: This won't work without a token, so it's just for reference 
// or I can try to run it on the server if I have access to tokens.
