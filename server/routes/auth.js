const express = require('express');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
    windowMs: process.env.NODE_ENV === 'production' ? 15 * 60 * 1000 : 1000, 
    max: process.env.NODE_ENV === 'production' ? 5 : 10,
    message: { error: 'Too many login attempts. Please try again later.' },
    skipSuccessfulRequests: true
});

// POST /api/login
router.post('/login', loginLimiter, async (req, res) => {
    console.log('=== LOGIN ROUTE STARTED ===');
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);
    
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
            console.log(`[AUTH_DEBUG] Invalid credentials for ${email}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!user.passwordHash) {
            console.log('User has no password hash');
            return res.status(401).json({ error: 'Invalid credentials' }); // Changed error message for consistency
        }

        // Handle both hashed and plain text passwords
        let isPasswordValid = false;
        const isHashed = user.passwordHash.startsWith('$');
        
        if (isHashed) {
            isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        } else {
            isPasswordValid = (password === user.passwordHash);
            // If plain text match, we should hash it for the future
            if (isPasswordValid) {
                console.log(`[AUTH] Hashing legacy plain-text password for ${email}`);
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);
                await prisma.user.update({
                    where: { id: user.id },
                    data: { passwordHash: hashedPassword }
                }).catch(err => console.error('[AUTH] Failed to upgrade password hash:', err));
            }
        }

        console.log(`[AUTH_DEBUG] Password valid (${isHashed ? 'hashed' : 'plain'}): ${isPasswordValid}`);

        if (!isPasswordValid) {
            console.log(`[AUTH_DEBUG] Invalid password for ${email}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Create JWT token
        console.log('Creating JWT token for user:', user.id);
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        console.log('JWT token created successfully');

        // Set HttpOnly cookie
        console.log('Setting cookie');
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000
        });
        console.log('Cookie set successfully');

        console.log('Sending success response');
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
        console.log('Response sent successfully');

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