const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

const JWT_SECRET = process.env.JWT_SECRET;

// Fail fast at startup if the secret is missing or too weak
if (!JWT_SECRET || JWT_SECRET.length < 32) {
    console.error('[Auth] FATAL: JWT_SECRET is missing or too short (minimum 32 characters). Server will not start.');
    process.exit(1);
}

// Middleware to verify JWT token from HTTP-only cookie
const verifyToken = async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });

        // Verify token version against DB to support session invalidation after password change
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { tokenVersion: true }
        });

        if (!user || (decoded.tokenVersion ?? 0) !== user.tokenVersion) {
            res.clearCookie('token');
            return res.status(403).json({ error: 'Session invalidated. Please log in again.' });
        }

        req.user = decoded;
        next();
    } catch (err) {
        res.status(403).json({ error: 'Invalid or expired token.' });
    }
};

// Middleware to verify if user has ADMIN role
const verifyAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied. Requires ADMIN privileges.' });
    }
    next();
};

module.exports = {
    verifyToken,
    verifyAdmin,
    JWT_SECRET
};
