// Test if registration is actually blocked on the backend
async function testRegistrationBlock() {
    try {
        console.log('Testing /api/auth/register endpoint...');
        const response = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'blocking_test@4js.com',
                password: 'SomePassword123!',
                firstName: 'Test',
                lastName: 'User',
                department: 'IT'
            })
        });

        const data = await response.json();
        console.log(`Status: ${response.status}`);
        console.log('Response body:', data);

        if (response.status === 403) {
            console.log('\n✓ Success: Registration is correctly blocked with 403 Forbidden.');
        } else {
            console.error('\n✖ Failure: Registration is not correctly blocked!');
        }
    } catch (error) {
        console.error('Error during test:', error.message);
    }
}

testRegistrationBlock();
