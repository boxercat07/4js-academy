async function testUniqueness() {
    const baseUrl = 'http://localhost:3000/api';
    
    // Login to get token
    console.log('Logging in as vincent.martinet@4js.com...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'vincent.martinet@4js.com', password: 'Admin123!' })
    });
    
    if (!loginRes.ok) {
        console.error('Login failed:', loginRes.status);
        return;
    }
    
    const cookie = loginRes.headers.get('set-cookie');
    console.log('Logged in successfully.');

    // 1. Try to create a duplicate track (AI BUSINESS already exists)
    console.log('Testing duplicate track creation (Expected: 409)...');
    const res = await fetch(`${baseUrl}/tracks`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Cookie': cookie
        },
        body: JSON.stringify({
            name: 'AI Business',
            description: 'Duplicate test'
        })
    });

    console.log('Status (expect 409):', res.status);
    const data = await res.json();
    console.log('Response:', data);

    // 2. Test slug-based retrieval
    console.log('\nTesting slug-based retrieval (Expected: 200)...');
    const slugRes = await fetch(`${baseUrl}/tracks/slug/ai-business`, {
        headers: { 'Cookie': cookie }
    });
    console.log('Status (expect 200):', slugRes.status);
    if (slugRes.ok) {
        const track = await slugRes.json();
        console.log('Found track:', track.name, 'Slug:', track.slug);
    }
}

testUniqueness().catch(console.error);
