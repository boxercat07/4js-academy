const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// Fail fast at startup if the secret is missing or too weak
if (!JWT_SECRET || JWT_SECRET.length < 32) {
    console.error('[Auth] FATAL: JWT_SECRET is missing or too short (minimum 32 characters). Server will not start.');
    process.exit(1);
}

// Middleware to verify JWT token from HTTP-only cookie
const verifyToken = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
        req.user = decoded; // { id, email, role, firstName, lastName }
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
