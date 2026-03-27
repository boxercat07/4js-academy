const app = require('./server/app');

// Schema migrations must be run explicitly via: npx prisma migrate deploy
// Never run prisma db push --accept-data-loss automatically on startup.

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
