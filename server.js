const app = require('./server/app');
const { execSync } = require('child_process');

try {
    console.log('Pushing database schema to ensure sync...');
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
    console.log('Database schema push complete.');
} catch (error) {
    console.error('Failed to push database schema:', error);
}

// Render fournit le port via process.env.PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
