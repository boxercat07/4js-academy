const BASE_URL = 'http://localhost:3000/api';

const testRegistration = async (email, password, description) => {
    console.log(`\nTesting: ${description}`);
    console.log(`Email: ${email}, Password: ${password}`);
    try {
        const response = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password,
                firstName: 'Test',
                lastName: 'User',
                department: 'R&D'
            })
        });
        const data = await response.json();
        if (response.ok) {
            console.log('Result: SUCCESS (Unexpected if testing invalid)');
        } else {
            console.log(`Result: FAILED as expected. Error: ${data.error}`);
        }
    } catch (error) {
        console.log(`Result: ERROR. Message: ${error.message}`);
    }
};

const runTests = async () => {
    // 1. Invalid Email Domain
    await testRegistration('test@gmail.com', 'ComplexPass123!', 'Invalid Email Domain');

    // 2. Password too short
    await testRegistration('test@4js.com', 'Short1!', 'Password too short');

    // 3. Password missing uppercase
    await testRegistration('test@4js.com', 'lowercase123!', 'Password missing uppercase');

    // 4. Password missing lowercase
    await testRegistration('test@4js.com', 'UPPERCASE123!', 'Password missing lowercase');

    // 5. Password missing number
    await testRegistration('test@4js.com', 'NoNumberPass!', 'Password missing number');

    // 6. Password missing special char
    await testRegistration('test@4js.com', 'NoSpecialPass123', 'Password missing special char');

    // 7. Valid registration
    console.log('\nTesting: Valid Registration');
    try {
        const uniqueEmail = `valid_${Date.now()}@4js.com`;
        const response = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: uniqueEmail,
                password: 'StrongPassword123!',
                firstName: 'Valid',
                lastName: 'User',
                department: 'IT'
            })
        });
        const data = await response.json();
        if (response.ok) {
            console.log(`Result: SUCCESS. User created: ${uniqueEmail}`);
        } else {
            console.log(`Result: FAILED unexpectedly. Error: ${data.error}`);
        }
    } catch (error) {
        console.log(`Result: ERROR unexpectedly. Message: ${error.message}`);
    }
};

runTests();
