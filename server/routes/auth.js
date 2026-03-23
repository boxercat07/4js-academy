const express = require('express');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts',
    skipSuccessfulRequests: true
});

// POST /api/login
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt for:', email);

        if (!email || !password) {
            console.log('Missing email or password');
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const user = await prisma.user.findUnique({ where: { email }, include: { tracks: true } });
        console.log('User found:', user ? 'yes' : 'no');
        if (!user) {
            console.log('User not found for email:', email);
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        if (!user.passwordHash) {
            console.log('User has no password hash');
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        console.log('Password hash type:', user.passwordHash.startsWith('$') ? 'hashed' : 'plain');

        // Check password - handle both hashed and plain text
        let isValidPassword = false;
        if (user.passwordHash.startsWith('$')) {
            isValidPassword = await bcrypt.compare(password, user.passwordHash);
            console.log('Hashed password check result:', isValidPassword);
        } else {
            isValidPassword = (password === user.passwordHash);
            console.log('Plain password check result:', isValidPassword);

            // If login successful, hash the password
            if (isValidPassword) {
                console.log('Hashing plain text password for user:', email);
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(user.passwordHash, salt);
                await prisma.user.update({
                    where: { id: user.id },
                    data: { passwordHash: hashedPassword }
                });
                console.log('Password hashed successfully');
            }
        }

        if (!isValidPassword) {
            console.log('Invalid password for user:', email);
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Create JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Set HttpOnly cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000
        });

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                department: user.department,
                tracks: user.tracks ? user.tracks.map(t => ({ id: t.id, name: t.name })) : []
            }
        });

    } catch (error) {
        console.error('Login error:', error.message);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ error: 'Internal server error during login.' });
    }
});

// POST /api/logout
router.post('/logout', async (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
});

// GET /api/me
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
    res.json({
        status: 'ok',
        message: 'Auth module working',
        timestamp: new Date().toISOString()
    });
});

// GET /api/users - List users (for debugging)
router.get('/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: { email: true, role: true, firstName: true, lastName: true }
        });
        res.json({ users });
    } catch (error) {
        console.error('Users list error:', error.message);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

module.exports = router;