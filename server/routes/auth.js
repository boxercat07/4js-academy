const express = require('express');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');
const { validateEmail, validatePassword } = require('../utils/validation');
const { auditLog } = require('../utils/auditLog');

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
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        console.log(`[AUTH] Attempting login for: ${email}`);
        
        const user = await prisma.user.findUnique({ where: { email }, include: { tracks: true } });
        if (!user) {
            console.log(`[AUTH] User not found: ${email}`);
            await auditLog(null, 'LOGIN', { status: 'FAILED', details: { email, reason: 'User not found' }, ipAddress: req.ip, userAgent: req.get('User-Agent') });
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        console.log(`[AUTH] User found: ${user.id}`);

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        let passwordValid = isMatch;

        // TEMPORARY: Handle plain text passwords (for migration)
        if (!passwordValid && !user.passwordHash.startsWith('$')) {
            console.log(`[AUTH] Checking plain text password for: ${email}`);
            passwordValid = (password === user.passwordHash);
            if (passwordValid) {
                console.log(`[AUTH] Plain text password match, will hash on success`);
            }
        }

        if (!passwordValid) {
            console.log(`[AUTH] Password mismatch for: ${email}`);
            await auditLog(user.id, 'LOGIN', { status: 'FAILED', details: { email, reason: 'Invalid password' }, ipAddress: req.ip, userAgent: req.get('User-Agent') });
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        console.log(`[AUTH] Password match`);

        // TEMPORARY: Hash plain text password on successful login
        if (!user.passwordHash.startsWith('$')) {
            console.log(`[AUTH] Hashing plain text password for: ${email}`);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(user.passwordHash, salt);
            await prisma.user.update({
                where: { id: user.id },
                data: { passwordHash: hashedPassword }
            });
            console.log(`[AUTH] Password hashed successfully`);
        }

        // Log successful login
        await auditLog(user.id, 'LOGIN', { status: 'SUCCESS', details: { email }, ipAddress: req.ip, userAgent: req.get('User-Agent') });

        // Create token
        try {
            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            console.log(`[AUTH] Token signed`);

            // Set HttpOnly cookie
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            });
            console.log(`[AUTH] Cookie set`);

            res.json({
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
            });
        } catch (jwtError) {
            console.error('[AUTH] JWT Signing error:', jwtError);
            throw jwtError;
        }
    } catch (error) {
        console.error('[AUTH] Catch-all Login error:', error);
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

module.exports = router;


