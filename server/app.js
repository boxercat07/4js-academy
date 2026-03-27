require('dotenv').config();
console.log('=========================================');
console.log('   SERVER STARTING V2 - ' + new Date().toISOString());
console.log('=========================================');

// Critical environment variable checks
console.log('🔍 Checking environment variables...');
console.log(
    'JWT_SECRET:',
    process.env.JWT_SECRET ? '✅ Set (' + process.env.JWT_SECRET.length + ' chars)' : '❌ MISSING'
);
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
const prisma = require('./prisma');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { verifyToken } = require('./middleware/auth');

const app = express();
const port = process.env.PORT || 3000;

// Trust the first proxy hop (required for correct IP-based rate limiting on Render/Heroku)
app.set('trust proxy', 1);

// Rate Limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per 15 minutes
    message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});

const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // Limit each IP to 10 uploads per 15 minutes
    message: { error: 'Too many upload attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Middleware
// CORS Configuration - Restrict to allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://localhost:5173', 'https://fourjs-academy.onrender.com'];

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no Origin header (direct browser navigation, static files)
        // and requests from whitelisted origins.
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.error('❌ CORS Blocked Origin:', origin);
            callback(new Error('CORS policy violation: origin not allowed'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

// Helmet Configuration - Security Headers
// Note: We DON'T pass contentSecurityPolicy to helmet because helmet v8 ignores `false`.
// Instead we handle CSP manually below.
const currentEnv = process.env.NODE_ENV || 'development';
const isDev = currentEnv === 'development';

console.log(`[SECURITY] Applying Helmet configuration for ${currentEnv} (CSP disabled: ${isDev})`);

app.use(
    helmet({
        contentSecurityPolicy: false, // Disable helmet's own CSP so we can set it manually below
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: false,
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        },
        frameguard: { action: 'sameorigin' },
        noSniff: true,
        xssFilter: true
    })
);

// Custom CSP Middleware - applied AFTER helmet
app.use((req, res, next) => {
    if (isDev) {
        // In development: remove any CSP header to allow all local testing
        res.removeHeader('Content-Security-Policy');
        res.removeHeader('Content-Security-Policy-Report-Only');
    } else {
        // In production: apply a secure, permissive CSP that allows YouTube embeds
        const csp = [
            "default-src 'self'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.quilljs.com https://cdn.jsdelivr.net",
            "style-src-attr 'unsafe-inline'",
            "script-src 'self' 'unsafe-inline' https://*.youtube.com https://*.youtube-nocookie.com https://*.google.com https://*.gstatic.com https://cdn.quilljs.com https://cdn.jsdelivr.net",
            "script-src-attr 'unsafe-inline'",
            "img-src 'self' data: https: blob: https://*.r2.dev https://*.cloudflarestorage.com https://fourjs-academy.onrender.com",
            "connect-src 'self' blob: https://*.r2.dev https://*.cloudflarestorage.com https://fonts.googleapis.com https://fonts.gstatic.com https://*.youtube.com https://*.google.com https://fourjs-academy.onrender.com",
            "font-src 'self' https://fonts.gstatic.com",
            "frame-src 'self' https://*.youtube.com https://*.youtube-nocookie.com https://*.google.com",
            "media-src 'self' blob: https://*.r2.dev https://*.cloudflarestorage.com https://*.googlevideo.com https://*.youtube.com",
            "object-src 'none'"
        ].join('; ');
        res.setHeader('Content-Security-Policy', csp);
    }
    next();
});

// Custom Security Headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
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
            const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });

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
app.use('/api', generalLimiter); // Apply general limits to all API endpoints
app.use('/api/upload', uploadLimiter); // Stricter limits for uploads

app.use('/api/auth', require('./routes/auth'));
app.use('/api/modules', require('./routes/modules'));
app.use('/api/users', require('./routes/users'));
app.use('/api/tracks', require('./routes/tracks'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/ratings', require('./routes/ratings'));

// Serve static frontend files from 'app' folder
app.use(
    express.static(path.join(__dirname, '../app'), {
        setHeaders: (res, path) => {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('Surrogate-Control', 'no-store');
        }
    })
);

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check Route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
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

// Proxy route for Quiz JSON to bypass CORS for R2
app.get('/api/proxy/quiz', verifyToken, async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) return res.status(400).json({ error: 'URL is required' });

        // Security: only allow r2.dev or cloudflarestorage.com or onrender.com
        const parsedUrl = new URL(url);
        const allowedHosts = ['.r2.dev', '.cloudflarestorage.com', 'fourjs-academy.onrender.com'];
        const isAllowed = allowedHosts.some(
            host => parsedUrl.hostname === host || parsedUrl.hostname.endsWith('.' + host)
        );

        if (!isAllowed) {
            console.error(`[Proxy] Blocked unauthorized host: ${parsedUrl.hostname}`);
            return res.status(403).json({ error: 'Host not allowed' });
        }

        console.log(`[Proxy] Fetching quiz data from: ${url}`);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`External fetch failed (HTTP ${response.status})`);

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('[Proxy] Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch quiz data.' });
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
    prisma
        .$connect()
        .then(() => {
            console.log('✅ Database connection successful');
            return prisma.user.count();
        })
        .then(userCount => {
            console.log(`✅ Database contains ${userCount} users`);
        })
        .catch(error => {
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
