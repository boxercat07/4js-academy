const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');
const { validateEmail, validatePassword } = require('../utils/validation');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/register (DISABLED)
router.post('/register', async (req, res) => {
    res.status(403).json({ error: 'Public registration is disabled. Please use the credentials provided by your administrator.' });
});

// POST /api/login
router.post('/login', async (req, res) => {
    try {
        console.log(`[AUTH] Attempting login for: ${email}`);
        
        const user = await prisma.user.findUnique({ where: { email }, include: { tracks: true } });
        if (!user) {
            console.log(`[AUTH] User not found: ${email}`);
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        console.log(`[AUTH] User found: ${user.id}`);

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            console.log(`[AUTH] Password mismatch for: ${email}`);
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        console.log(`[AUTH] Password match`);

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
router.post('/logout', (req, res) => {
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
