const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');
const { auditLog } = require('../utils/auditLog');

const router = express.Router();

const LEGACY_PASSWORD_RETIREMENT_DATE = new Date(process.env.LEGACY_PASSWORD_RETIREMENT_DATE || '2026-12-31');

const loginLimiter = rateLimit({
    windowMs: process.env.NODE_ENV === 'production' ? 15 * 60 * 1000 : 1000,
    max: process.env.NODE_ENV === 'production' ? 5 : 10,
    message: { error: 'Too many login attempts. Please try again later.' },
    skipSuccessfulRequests: true
});

// POST /api/login
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const DUMMY_HASH = '$2b$10$dummy.hash.to.prevent.user.enumeration.timing.attack00000';
        const user = await prisma.user.findUnique({ where: { email }, include: { tracks: true } });
        if (!user) {
            await bcrypt.compare(password, DUMMY_HASH);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!user.passwordHash) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Handle both hashed and plain text passwords
        let isPasswordValid = false;
        const isHashed = user.passwordHash.startsWith('$');

        if (isHashed) {
            isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        } else {
            // Check if legacy plaintext support has expired
            if (new Date() > LEGACY_PASSWORD_RETIREMENT_DATE) {
                console.warn(`[AUTH] Rejected legacy plaintext login for ${email} - support expired.`);
                return res.status(401).json({ error: 'Account requires password reset. Please contact support.' });
            }

            try {
                isPasswordValid = crypto.timingSafeEqual(Buffer.from(password), Buffer.from(user.passwordHash));
            } catch {
                isPasswordValid = false;
            }
            // If plain text match, we should hash it for the future
            if (isPasswordValid) {
                const salt = await bcrypt.genSalt(12);
                const hashedPassword = await bcrypt.hash(password, salt);
                await prisma.user
                    .update({
                        where: { id: user.id },
                        data: { passwordHash: hashedPassword }
                    })
                    .then(() => {
                        auditLog(user.id, 'PASSWORD_UPGRADE', {
                            resourceType: 'USER',
                            resourceId: user.id,
                            details: { automatic: true },
                            ipAddress: req.ip,
                            userAgent: req.headers['user-agent']
                        });
                    })
                    .catch(err => console.error('[AUTH] Failed to upgrade password hash:', err));
            }
        }

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Create JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
            JWT_SECRET,
            { expiresIn: '4h' }
        );

        // Set HttpOnly cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 4 * 60 * 60 * 1000
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

/*
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
*/

module.exports = router;
