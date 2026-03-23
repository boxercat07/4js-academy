const express = require('express');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');
const { validateEmail, validatePassword } = require('../utils/validation');
const { auditLog } = require('../utils/auditLog');

console.log('[AUTH] ===== AUTH MODULE LOADED =====');
console.log('[AUTH] JWT_SECRET available:', !!JWT_SECRET);
console.log('[AUTH] JWT_SECRET length:', JWT_SECRET ? JWT_SECRET.length : 'N/A');
console.log('[AUTH] NODE_ENV:', process.env.NODE_ENV);
console.log('[AUTH] DATABASE_URL available:', !!process.env.DATABASE_URL);

const router = express.Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts',
    skipSuccessfulRequests: true
});
const prisma = new PrismaClient();

// POST /api/register (DISABLED)
router.post('/register', async (req, res) => {
    res.status(403).json({ error: 'Public registration is disabled. Please use the credentials provided by your administrator.' });
});

// POST /api/login
router.post('/login', loginLimiter, async (req, res) => {
    console.log('[LOGIN] ===== START LOGIN ATTEMPT =====');
    console.log('[LOGIN] Request body:', { email: req.body.email, hasPassword: !!req.body.password });
    console.log('[LOGIN] Headers:', {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent']?.substring(0, 50)
    });

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            console.log('[LOGIN] Missing email or password');
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        console.log(`[LOGIN] Attempting login for: ${email}`);
        
        const user = await prisma.user.findUnique({ where: { email }, include: { tracks: true } });
        if (!user) {
            console.log(`[LOGIN] User not found: ${email}`);
            await auditLog(null, 'LOGIN', { status: 'FAILED', details: { email, reason: 'User not found' }, ipAddress: req.ip, userAgent: req.get('User-Agent') });
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        console.log(`[LOGIN] User found: ${user.id}, passwordHash starts with $: ${user.passwordHash.startsWith('$')}`);

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        console.log(`[LOGIN] bcrypt.compare result: ${isMatch}`);
        let passwordValid = isMatch;

        // TEMPORARY: Handle plain text passwords (for migration)
        if (!passwordValid && !user.passwordHash.startsWith('$')) {
            console.log(`[LOGIN] Checking plain text password for: ${email}`);
            passwordValid = (password === user.passwordHash);
            console.log(`[LOGIN] Plain text comparison result: ${passwordValid}`);
            if (passwordValid) {
                console.log(`[LOGIN] Plain text password match, will hash on success`);
            }
        }

        if (!passwordValid) {
            console.log(`[LOGIN] Password mismatch for: ${email}`);
            await auditLog(user.id, 'LOGIN', { status: 'FAILED', details: { email, reason: 'Invalid password' }, ipAddress: req.ip, userAgent: req.get('User-Agent') });
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        console.log(`[LOGIN] Password match`);

        // TEMPORARY: Hash plain text password on successful login
        if (!user.passwordHash.startsWith('$')) {
            console.log(`[LOGIN] Hashing plain text password for: ${email}`);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(user.passwordHash, salt);
            await prisma.user.update({
                where: { id: user.id },
                data: { passwordHash: hashedPassword }
            });
            console.log(`[LOGIN] Password hashed successfully`);
        }

        // Log successful login
        await auditLog(user.id, 'LOGIN', { status: 'SUCCESS', details: { email }, ipAddress: req.ip, userAgent: req.get('User-Agent') });

        // Create token
        console.log('[LOGIN] Creating JWT token');
        try {
            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            console.log(`[LOGIN] Token signed successfully`);

            // Set HttpOnly cookie
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            });
            console.log(`[LOGIN] Cookie set`);

            const responseData = {
                message: 'Login successful',
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    department: user.department,
                    tracks: user.tracks.map(t => ({ id: t.id, name: t.name }))
                }
            };
            console.log('[LOGIN] Sending success response');
            res.json(responseData);
            console.log('[LOGIN] ===== LOGIN SUCCESS =====');
        } catch (jwtError) {
            console.error('[LOGIN] JWT Signing error:', jwtError);
            throw jwtError;
        }
    } catch (error) {
        console.error('[LOGIN] ===== LOGIN ERROR =====');
        console.error('[LOGIN] Catch-all Login error:', error);
        console.error('[LOGIN] Error stack:', error.stack);
        res.status(500).json({ error: 'Internal server error during login.' });
    }
});

// POST /api/logout
router.post('/logout', async (req, res) => {
    // Get user from token if available
    let userId = null;
    try {
        const token = req.cookies.token;
        if (token) {
            const decoded = jwt.verify(token, JWT_SECRET);
            userId = decoded.id;
        }
    } catch (e) {
        // Token invalid, continue
    }

    await auditLog(userId, 'LOGOUT', { status: 'SUCCESS', ipAddress: req.ip, userAgent: req.get('User-Agent') });
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
});

// GET /api/me (Returns logged in user info with tracks)
router.get('/me', verifyToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { tracks: true }
        });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { passwordHash, ...safeUser } = user;
        res.json({ user: safeUser });
    } catch (error) {
        console.error('Error in /api/me:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Test auth endpoint
router.get('/test', (req, res) => {
    try {
        console.log('[AUTH TEST] Testing auth imports...');
        console.log('[AUTH TEST] JWT_SECRET available:', !!JWT_SECRET);
        console.log('[AUTH TEST] JWT_SECRET length:', JWT_SECRET ? JWT_SECRET.length : 'N/A');
        
        // Test Prisma connection
        console.log('[AUTH TEST] Testing Prisma...');
        
        res.json({
            status: 'ok',
            message: 'Auth module loaded successfully',
            jwt_secret: !!JWT_SECRET,
            jwt_length: JWT_SECRET ? JWT_SECRET.length : 0,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[AUTH TEST] Error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message,
            stack: error.stack
        });
    }
});

module.exports = router;


