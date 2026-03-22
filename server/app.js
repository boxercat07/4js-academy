require('dotenv').config();
console.log('=========================================');
console.log('   SERVER STARTING V2 - ' + new Date().toISOString());
console.log('=========================================');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 3000;

// Middleware
// CORS Configuration - Restrict to allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://localhost:5173'];

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('CORS policy violation'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Protected Static Routes Middleware
app.use((req, res, next) => {
    // Only intercept requests for HTML files or the root path
    if (req.path.endsWith('.html') || req.path === '/' || req.path === '') {
        const publicPages = ['/login.html', '/index.html', '/ui-kit.html', '/success.html', '/'];

        // Skip protection for public pages
        if (publicPages.includes(req.path)) {
            return next();
        }

        // Check for token in cookies
        const token = req.cookies.token;

        if (!token) {
            // Not authenticated, redirect to login
            return res.redirect('/login.html');
        }

        try {
            // Verify token using the same secret (we'll require it from auth middleware)
            const { JWT_SECRET } = require('./middleware/auth');
            const jwt = require('jsonwebtoken');
            const decoded = jwt.verify(token, JWT_SECRET);

            // If trying to access admin pages, check role
            if ((req.path.startsWith('/admin-') || req.path === '/technical-track.html') && decoded.role !== 'ADMIN') {
                return res.redirect('/tracks.html');
            }

            // Valid token, proceed to serve static file
            next();
        } catch (err) {
            // Token invalid or expired, clear cookie and redirect
            res.clearCookie('token');
            return res.redirect('/login.html');
        }
    } else {
        // Not an HTML file (css, js, images, etc.), let it through
        next();
    }
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/modules', require('./routes/modules'));
app.use('/api/users', require('./routes/users'));
app.use('/api/tracks', require('./routes/tracks'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/notifications', require('./routes/notifications'));

// Serve static frontend files from 'app' folder
app.use(express.static(path.join(__dirname, '../app'), {
    setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
    }
}));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check Route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Four Js Academy Backend is running' });
});

// Seed Initial Data Route (For development purposes only)
app.post('/api/seed', async (req, res) => {
    try {
        // Create Default Tracks
        const techTrack = await prisma.track.create({
            data: { name: 'TECHNICAL', description: 'Technical learning pathway' }
        });
        const bizTrack = await prisma.track.create({
            data: { name: 'BUSINESS', description: 'Business strategy pathway' }
        });

        // Add dummy modules
        await prisma.module.create({
            data: {
                title: 'System Fundamentals',
                description: 'Core architecture and engine setup',
                trackId: techTrack.id,
                duration: 60,
                type: 'VIDEO TUTORIAL',
                status: 'PUBLISHED',
                order: 1
            }
        });

        await prisma.module.create({
            data: {
                title: 'Enterprise Integration',
                description: 'Connecting with generic stacks',
                trackId: bizTrack.id,
                duration: 120,
                type: 'DOCUMENT',
                status: 'DRAFT',
                order: 1
            }
        });

        res.json({ message: 'Database seeded successfully' });
    } catch (error) {
        console.error('Seed Error:', error);
        res.status(500).json({ error: 'Failed to seed database' });
    }
});

// Start Server
if (require.main === module && process.env.NODE_ENV !== 'test') {
    // Global Error Handling Middleware (MUST be last)
app.use((err, req, res, next) => {
    console.error('[Global Error Handler]', err);
    
    // Don't expose internal error details to client
    const statusCode = err.statusCode || 500;
    const isDev = process.env.NODE_ENV === 'development';
    
    res.status(statusCode).json({
        error: isDev ? err.message : 'An error occurred. Please try again later.',
        ...(isDev && { stack: err.stack })
    });
});
app.listen(port, () => {
        console.log(`AI Academy backend listening at http://localhost:${port}`);
    });
}

// Graceful shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

module.exports = app;



