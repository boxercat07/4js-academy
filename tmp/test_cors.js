
const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173', 'https://fourjs-academy.onrender.com'];

function checkOrigin(origin) {
    console.log(`Checking origin: ${origin}`);
    if (!origin || allowedOrigins.includes(origin)) {
        console.log('✅ Allowed');
        return true;
    } else {
        console.error(`❌ CORS Blocked Origin: ${origin}`);
        console.log('Allowed Origins List:', allowedOrigins);
        return false;
    }
}

console.log('--- Test Cases ---');
checkOrigin(undefined); // Should be allowed
checkOrigin('http://localhost:3000'); // Should be allowed
checkOrigin('https://fourjs-academy.onrender.com'); // Should be allowed
checkOrigin('https://wrong-domain.com'); // Should be blocked
checkOrigin('http://fourjs-academy.onrender.com'); // Should be blocked (if only https is allowed)
