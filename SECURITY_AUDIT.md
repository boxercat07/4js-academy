# Security Audit Report - Stitch AI Academy Portal
**Date:** March 22, 2026  
**Status:** ⚠️ Multiple Critical Issues Found

---

## Executive Summary

The AI Academy Portal contains **6 CRITICAL**, **4 HIGH**, and **5 MEDIUM** severity security vulnerabilities that require immediate remediation. The most severe issues involve hardcoded secrets, weak default JWT secrets, improper CORS configuration, and missing rate limiting.

---

## 🔴 CRITICAL ISSUES

### 1. **Hardcoded Weak JWT Secret Fallback**
**Location:** [server/middleware/auth.js](server/middleware/auth.js#L3)  
**Severity:** CRITICAL  
**CVE Impact:** JWT Secret Bypass, Authentication Bypass

```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'ai-academy-super-secret-key-for-dev';
```

**Risk:** 
- Default fallback secret is publicly visible in source code
- Production system could use this weak default if `JWT_SECRET` env is not set
- Anyone with access to the code can forge valid JWT tokens
- Affects [server/app.js](server/app.js#L41), auth middleware validation

**Remediation:**
```javascript
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable must be set');
    process.exit(1);
}
```

**Timeline:** Fix IMMEDIATELY before any production deployment

---

### 2. **Overly Permissive CORS Configuration**
**Location:** [server/app.js](server/app.js#L15)  
**Severity:** CRITICAL  
**CVE Impact:** CSRF, Cross-Origin Data Theft

```javascript
app.use(cors()); // In production, configure origins
```

**Risk:**
- Allows requests from ANY origin
- Browser-based CSRF attacks possible
- Malicious websites can make authenticated requests on behalf of users
- All API endpoints vulnerable to cross-origin exploitation

**Remediation:**
```javascript
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**Timeline:** Fix IMMEDIATELY

---

### 3. **No Rate Limiting on Authentication Endpoints**
**Location:** [server/routes/auth.js](server/routes/auth.js#L13)  
**Severity:** CRITICAL  
**CVE Impact:** Brute Force Attack

**Risk:**
- Login endpoint has no rate limiting
- Attacker can perform unlimited password guessing attempts
- `POST /api/login` is unprotected and publicly accessible
- Single user account can be compromised through brute force

**Remediation:**
```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: 'Too many login attempts. Please try again later.',
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/login', loginLimiter, async (req, res) => {
    // ... existing code
});
```

**Timeline:** Fix IMMEDIATELY

---

### 4. **Public Seed Endpoint Accessible in Production**
**Location:** [server/app.js](server/app.js#L95)  
**Severity:** CRITICAL  
**CVE Impact:** Database Manipulation, Data Corruption

```javascript
// Seed Initial Data Route (For development purposes only)
app.post('/api/seed', async (req, res) => {
    // Creates database entries without authentication
});
```

**Risk:**
- Anyone can hit `/api/seed` to create test data
- No authentication or environment check
- Can corrupt production database
- Comment says "development purposes only" but runs everywhere

**Remediation:**
```javascript
// Remove from production or add protection
app.post('/api/seed', (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ error: 'Seed endpoint only available in development' });
    }
    
    if (req.body.seedToken !== process.env.SEED_TOKEN) {
        return res.status(403).json({ error: 'Invalid seed token' });
    }
    
    // ... existing seed logic
});
```

**Timeline:** Remove or protect IMMEDIATELY

---

### 5. **Debug JWT Secret Hardcoded in Codebase**
**Location:** [debug_api.js](../debug_api.js#L4)  
**Severity:** CRITICAL  
**CVE Impact:** Full Authentication Bypass

```javascript
const JWT_SECRET = 'stitch-secret-2026'; // Based on my knowledge of the project
const token = jwt.sign({ id: 'admin-debug', role: 'ADMIN' }, JWT_SECRET);
```

**Risk:**
- Debug script with hardcoded JWT secret committed to version control
- If this secret matches the JWT_SECRET env var, attacker can forge admin tokens
- Script can generate admin authentication tokens
- Exposed in git history permanently

**Remediation:**
```bash
# Remove debug_api.js from codebase
# Or convert to interactive script that takes secret as input
# Add *.debug.js to .gitignore
# Rotate JWT_SECRET if it was 'stitch-secret-2026'
```

**Timeline:** Remove IMMEDIATELY, rotate all secrets

---

### 6. **Missing CSRF Protection**
**Location:** [server/app.js](server/app.js#L1)  
**Severity:** CRITICAL  
**CVE Impact:** Cross-Site Request Forgery

**Risk:**
- No CSRF tokens implemented
- No CSRF middleware configured
- POST/PUT/DELETE endpoints vulnerable to CSRF attacks
- Especially critical for state-changing operations (enrollment, progress updates)

**Remediation:**
```bash
npm install csurf
```

```javascript
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: false });

// Generate CSRF token for forms
app.get('/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

// Protect state-changing routes
app.use('/api/', csrfProtection);
```

**Timeline:** Implement IMMEDIATELY for all state-changing endpoints

---

## 🟠 HIGH SEVERITY ISSUES

### 7. **No Input Validation on Multiple Routes**
**Location:** [server/routes/tracks.js](server/routes/tracks.js#L28), [server/routes/modules.js](server/routes/modules.js#L25)  
**Severity:** HIGH  
**CVE Impact:** NoSQL Injection (Prisma ORM Protected), XSS in UI

**Risk:**
- `name`, `description`, `title` fields accept raw user input
- While Prisma provides some protection from SQL injection, XSS is still possible
- No length validation
- No sanitization before storage

**Current State:**
```javascript
// tracks.js - minimal validation
const { name, description, icon, targetDepartments } = req.body;
if (!name) {
    return res.status(400).json({ error: 'Track name is required.' });
}
// But no length limits, no special character checks
```

**Remediation:**
```bash
npm install validator joi
```

```javascript
const { body, validationResult } = require('express-validator');

router.post('/', verifyToken, verifyAdmin, [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 1, max: 255 }).withMessage('Name must be 1-255 characters')
        .isAlphanumeric('en-US', { ignore: ' -' }).withMessage('Name can only contain letters, numbers, spaces, and hyphens'),
    body('description')
        .trim()
        .isLength({ max: 5000 }).withMessage('Description must be under 5000 characters'),
    body('icon')
        .optional()
        .trim()
        .isIn(['terminal', 'cog', 'book', 'star']).withMessage('Invalid icon selection')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    // ... continue with creation
});
```

**Timeline:** Implement within 1 week

---

### 8. **Missing Error Handling Details Exposure**
**Location:** [server/routes/auth.js](server/routes/auth.js#L23-L30)  
**Severity:** HIGH  
**CVE Impact:** Information Disclosure, User Enumeration

```javascript
console.log(`[AUTH] Attempting login for: ${email}`); // Exposed in console/logs
console.log(`[AUTH] User not found: ${email}`);        // Confirms user doesn't exist
console.log(`[AUTH] Password mismatch for: ${email}`); // Confirms user exists
```

**Risk:**
- User enumeration: attacker can determine if email exists by login behavior
- Detailed logs could be exposed in monitoring systems
- Server responses leak information about which accounts exist

**Remediation:**
```javascript
// Use generic error response
if (!user) {
    console.log(`[AUTH] Failed login attempt for: ${email}`); // Generic log
    return res.status(401).json({ error: 'Invalid email or password.' }); // Same message
}

if (!isMatch) {
    console.log(`[AUTH] Failed login attempt for: ${email}`); // Same generic log
    return res.status(401).json({ error: 'Invalid email or password.' }); // Same message
}

// For monitoring, log separately without exposing details
logSecurityEvent('login_failure', { emailDomain: email.split('@')[1], timestamp: new Date() });
```

**Timeline:** Implement within 2 days

---

### 9. **Insecure Cookie Configuration in Non-HTTPS**
**Location:** [server/routes/auth.js](server/routes/auth.js#L43)  
**Severity:** HIGH  
**CVE Impact:** Session Hijacking, MITM Attack

```javascript
res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Only secure in production
    maxAge: 24 * 60 * 60 * 1000
});
```

**Risk:**
- In development, `secure: false` means token sent over HTTP
- Cookie can be intercepted if development done over unencrypted connection
- SameSite attribute not set (missing CSRF protection)

**Remediation:**
```javascript
res.cookie('token', token, {
    httpOnly: true,
    secure: true, // Always true - enforce HTTPS
    sameSite: 'strict', // Prevent CSRF
    maxAge: 24 * 60 * 60 * 1000,
    path: '/'
});

// Also add HTTPS redirect in production
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            res.redirect(`https://${req.header('host')}${req.url}`);
        } else {
            next();
        }
    });
}
```

**Timeline:** Implement within 1 week

---

### 10. **No Password Reset Security**
**Location:** [server/routes/users.js](server/routes/users.js)  
**Severity:** HIGH  
**CVE Impact:** Unauthorized Account Takeover

**Risk:**
- No password reset endpoint visible (or if present, not secure)
- Admin endpoint to create/reset users doesn't enforce password complexity validation during update
- No email verification for password changes
- No audit trail of password changes

**Remediation:**
```javascript
// Implement secure password reset flow
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
        // Don't reveal if user exists
        return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }
    
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = bcrypt.hashSync(resetToken, 10);
    
    await prisma.passwordReset.create({
        data: {
            userId: user.id,
            token: hashedToken,
            expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 hour
        }
    });
    
    // Send email with reset link
    await sendResetEmail(user.email, resetToken);
    res.json({ message: 'If that email exists, a reset link has been sent.' });
});
```

**Timeline:** Implement within 1 week

---

## 🟡 MEDIUM SEVERITY ISSUES

### 11. **Missing Security Headers**
**Location:** [server/app.js](server/app.js#L1)  
**Severity:** MEDIUM  
**CVE Impact:** Clickjacking, XSS, MIME Sniffing

**Risk:**
- No `X-Frame-Options` header - clickjacking attacks possible
- No `X-Content-Type-Options: nosniff` - MIME sniffing vulnerabilities
- No `Content-Security-Policy` - XSS protection weak
- No `Strict-Transport-Security` - HTTPS not enforced

**Remediation:**
```bash
npm install helmet
```

```javascript
const helmet = require('helmet');

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"], // Tighten in production
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    hsts: { maxAge: 31536000, includeSubDomains: true }
}));
```

**Timeline:** Implement within 2 days

---

### 12. **Missing Request Body Size Limits**
**Location:** [server/app.js](server/app.js#L16)  
**Severity:** MEDIUM  
**CVE Impact:** DoS Attack, Memory Exhaustion

```javascript
app.use(express.json()); // No limit specified
```

**Risk:**
- Attacker can send extremely large JSON payloads
- Could cause out-of-memory errors
- Server could be DOS'd with large request bodies

**Remediation:**
```javascript
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
```

**Timeline:** Implement within 1 week

---

### 13. **Admin Role Access Not Properly Enforced**
**Location:** [server/app.js](server/app.js#L46)  
**Severity:** MEDIUM  
**CVE Impact:** Privilege Escalation

```javascript
// In app.js - static file protection
if ((req.path.startsWith('/admin-') || req.path === '/technical-track.html') && decoded.role !== 'ADMIN') {
    return res.redirect('/tracks.html');
}
```

**Risk:**
- Role checking in middleware, but no consistent verification
- User table allows any role string to be set
- No explicit role enum validation at database level
- Frontend can be bypassed to reveal admin endpoints

**Remediation:**
```javascript
// In schema.prisma
model User {
    // ... existing fields
    role    String  @default("LEARNER") // Change to enum
}

// Better approach:
enum UserRole {
    ADMIN
    LEARNER
    INSTRUCTOR
}

model User {
    id      String   @id @default(uuid())
    role    UserRole @default(LEARNER) // Type-safe role
    // ... rest
}
```

**Timeline:** Implement within 2 weeks

---

### 14. **File Upload Without Proper Validation**
**Location:** [server/routes/upload.js](server/routes/upload.js#L27)  
**Severity:** MEDIUM  
**CVE Impact:** File Type Spoofing, Malware Upload

```javascript
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // Only checks size, not type
});
```

**Risk:**
- Only file size validated, no file type checking
- MIME type can be spoofed
- Executable files could be uploaded and served
- 50MB limit is very generous for an academy platform

**Remediation:**
```javascript
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'video/mp4', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${file.mimetype} not allowed`), false);
        }
    }
});
```

**Timeline:** Implement within 1 week

---

### 15. **No Audit Logging for Sensitive Operations**
**Location:** [server/routes](server/routes)  
**Severity:** MEDIUM  
**CVE Impact:** Lack of Accountability, Forensics

**Risk:**
- No logging of admin actions (create user, delete tracks, etc.)
- No audit trail for sensitive data access
- Unauthorized access difficult to detect and investigate
- Compliance requirements may not be met

**Remediation:**
```javascript
// Create audit logging middleware
const auditLog = (action, userId, resourceType, resourceId, details = {}) => {
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        action,
        userId,
        resourceType,
        resourceId,
        details,
        ipAddress: req.ip
    }));
    
    // Also store in database
    prisma.auditLog.create({
        data: { action, userId, resourceType, resourceId, details }
    });
};

// Use in routes
router.delete('/api/users/:id', verifyToken, verifyAdmin, async (req, res) => {
    const user = await prisma.user.delete({ where: { id: req.params.id } });
    auditLog('DELETE_USER', req.user.id, 'User', req.params.id, { email: user.email });
    res.json({ message: 'User deleted' });
});
```

**Timeline:** Implement within 2 weeks

---

## 📋 Dependency & Configuration Issues

### 16. **Missing .gitignore Entries**
**Severity:** MEDIUM

**Current .gitignore should include:**
```
.env
.env.local
.env.*.local
node_modules/
*.log
.DS_Store
uploads/
dist/
build/
coverage/
.vscode/
.idea/
*.debug.js
```

---

### 17. **Weak Temporary Password in Bulk Import**
**Location:** [server/routes/users.js](server/routes/users.js#L255)  
**Severity:** MEDIUM

```javascript
const passwordToHash = password || 'Stitch2026!#'; // Hard-coded default
```

This default password appears in source code and logs. While it meets complexity requirements, it's predictable.

---

## 🟢 Implementation Checklist

### Immediate (Today)
- [ ] Remove or protect `/api/seed` endpoint
- [ ] Remove `debug_api.js` from codebase
- [ ] Add required JWT_SECRET validation to fail if not set
- [ ] Configure restricted CORS with whitelisted origins
- [ ] Add CSRF protection middleware
- [ ] Add rate limiting to `/api/login`

### This Week
- [ ] Implement helmet.js for security headers
- [ ] Add request body size limits
- [ ] Implement password reset security flow
- [ ] Add input validation to all routes
- [ ] Fix file upload validation

### Next 2 Weeks
- [ ] Implement audit logging
- [ ] Change role to database enum
- [ ] Add email verification for account changes
- [ ] Implement HTTPS redirect in production
- [ ] Add comprehensive error handling

---

## 🔍 Testing Recommendations

1. **CORS Testing**
   ```bash
   curl -H "Origin: http://evil.com" http://localhost:3000/api/me
   ```

2. **JWT Secret Testing**
   - Verify JWT_SECRET env var is required
   - Confirm no hardcoded defaults work

3. **Rate Limit Testing**
   - Send 10 login attempts in 1 minute
   - Verify 6th+ requests are blocked

4. **CSRF Testing**
   - Attempt state-changing requests without CSRF token
   - Verify they fail

5. **Input Validation Testing**
   - Send payloads with `<script>` tags
   - Send very long strings (>5000 chars)
   - Send special characters

---

## 📞 Next Steps

1. **Review this report** with security team
2. **Create tickets** for each critical issue
3. **Schedule sprint** to address critical items
4. **Schedule security training** for development team
5. **Consider third-party security audit** before production

---

**Report Generated:** March 22, 2026  
**Auditor:** Security Analysis Agent  
**Recommendation:** DO NOT DEPLOY to production until CRITICAL and HIGH issues are resolved.
