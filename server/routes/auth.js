const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');
const { validateEmail, validatePassword } = require('../utils/validation');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/register
router.post('/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName, department } = req.body;

        if (!email || !password || !firstName || !lastName || !department) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        const emailValidation = validateEmail(email);
        if (!emailValidation.isValid) {
            return res.status(400).json({ error: emailValidation.error });
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({ error: passwordValidation.error });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Assign first user as ADMIN automatically for testing (or keep as LEARNER)
        const userCount = await prisma.user.count();
        const role = userCount === 0 ? 'ADMIN' : 'LEARNER';

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                firstName,
                lastName,
                department,
                role
            }
        });

        // Create token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Set HttpOnly cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                department: user.department
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error during registration.' });
    }
});

// POST /api/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const user = await prisma.user.findUnique({ where: { email }, include: { tracks: true } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Create token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Set HttpOnly cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
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
                tracks: user.tracks.map(t => ({ id: t.id, name: t.name }))
            }
        });
    } catch (error) {
        console.error('Login error:', error);
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
