require('dotenv').config();
console.log('=========================================');
console.log('   SERVER STARTING V2 - ' + new Date().toISOString());
console.log('=========================================');

// Critical environment variable checks
console.log('🔍 Checking environment variables...');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set (' + process.env.JWT_SECRET.length + ' chars)' : '❌ MISSING');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ MISSING');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('ALLOWED_ORIGINS:', process.env.ALLOWED_ORIGINS || 'default');

if (!process.env.JWT_SECRET) {
    console.error('❌ CRITICAL: JWT_SECRET is not set! Server will not start properly.');
    process.exit(1);
}

if (!process.env.DATABASE_URL) {
    console.error('❌ CRITICAL: DATABASE_URL is not set! Server will not start properly.');
    process.exit(1);
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
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

// Helmet Configuration - Security Headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://cdn.tailwindcss.com", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"]
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true
}));

// Custom Security Headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
});

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

// Test route for debugging
app.get('/api/test', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: {
            NODE_ENV: process.env.NODE_ENV,
            JWT_SECRET: !!process.env.JWT_SECRET,
            DATABASE_URL: !!process.env.DATABASE_URL
        }
    });
});

// Seed Initial Data Route (DISABLED for security)
app.post('/api/seed', (req, res) => {
    return res.status(403).json({ error: 'Seed endpoint disabled' });
});

// Global error handler for API routes - ensures JSON responses
app.use('/api', (err, req, res, next) => {
    console.error('API Error:', err.message);
    console.error('Stack:', err.stack);
    if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
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

// Test database connection before starting server (only in production-like environments)
if (require.main === module && process.env.NODE_ENV !== 'test') {
    console.log('🔍 Testing database connection...');
    prisma.$connect()
        .then(() => {
            console.log('✅ Database connection successful');
            return prisma.user.count();
        })
        .then((userCount) => {
            console.log(`✅ Database contains ${userCount} users`);
        })
        .catch((error) => {
            console.error('❌ Database connection failed:', error.message);
            console.error('❌ This may cause login issues. Check DATABASE_URL.');
        });
}

// Graceful shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

module.exports = app;



