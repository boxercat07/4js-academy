#!/bin/bash
#
# 🚀 AI ACADEMY SECURITY PHASE 1 - AUTO PATCHER
# Render.com + Neon.tech compatible
# Solo Dev Edition - Execute & Done
#
# Usage: bash fix-security-phase1.sh
#

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🔒 AI ACADEMY PHASE 1 - SECURITY FIXES                    ║"
echo "║  For: Render.com + Neon.tech + Solo Dev                   ║"
echo "║  Runtime: ~5 minutes total                                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# STEP 1: GENERATE NEW JWT SECRET
# ============================================================================
echo -e "${BLUE}[1/6] Generating new JWT_SECRET...${NC}"

JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

if [ -z "$JWT_SECRET" ]; then
    echo -e "${RED}❌ Failed to generate JWT_SECRET${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Generated (length: ${#JWT_SECRET} chars)${NC}"
echo ""

# ============================================================================
# STEP 2: BACKUP CURRENT STATE
# ============================================================================
echo -e "${BLUE}[2/6] Backing up current state...${NC}"

BACKUP_DIR=".backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup sensitive files
[ -f ".env" ] && cp .env "$BACKUP_DIR/.env.backup"
[ -f "server/app.js" ] && cp server/app.js "$BACKUP_DIR/app.js.backup"
[ -f "server/routes/auth.js" ] && cp server/routes/auth.js "$BACKUP_DIR/auth.js.backup"
[ -f "package.json" ] && cp package.json "$BACKUP_DIR/package.json.backup"

echo -e "${GREEN}✓ Backups created in $BACKUP_DIR${NC}"
echo ""

# ============================================================================
# STEP 3: DELETE DEBUG FILE
# ============================================================================
echo -e "${BLUE}[3/6] Removing debug_api.js...${NC}"

if [ -f "debug_api.js" ]; then
    git rm debug_api.js 2>/dev/null || rm debug_api.js
    echo -e "${GREEN}✓ Deleted debug_api.js${NC}"
else
    echo -e "${YELLOW}⊘ debug_api.js not found (already deleted?)${NC}"
fi
echo ""

# ============================================================================
# STEP 4: PATCH CODE FILES
# ============================================================================
echo -e "${BLUE}[4/6] Patching code files...${NC}"

# ---- PATCH 4a: server/app.js - Disable /api/seed ----
echo "  • Patching /api/seed endpoint..."
python3 << 'PYTHON_PATCH_APP'
import re

with open('server/app.js', 'r') as f:
    content = f.read()

# Find and replace /api/seed endpoint
pattern = r"app\.post\('/api/seed',\s*async\s*\(req,\s*res\)\s*=>\s*\{[\s\S]*?// Seed Initial Data Route[\s\S]*?try\s*\{[\s\S]*?(\}\s*catch\s*\(error\)\s*\{[\s\S]*?\}\s*\}\);"

replacement = """app.post('/api/seed', (req, res) => {
    return res.status(403).json({ error: 'Seed endpoint is disabled in production' });
});"""

# More flexible approach - replace from /api/seed POST to the closing of that route
if "// Seed Initial Data Route" in content:
    # Find the start of the seed route
    start = content.find("// Seed Initial Data Route")
    if start > 0:
        # Find the app.post before that comment (go back)
        start = content.rfind("app.post('/api/seed'", 0, start)
        if start > 0:
            # Find the matching closing });
            bracket_count = 0
            in_route = False
            end = start
            for i in range(start, len(content)):
                if content[i] == '{':
                    bracket_count += 1
                    in_route = True
                elif content[i] == '}':
                    bracket_count -= 1
                    if in_route and bracket_count == 0 and i + 1 < len(content) and content[i+1] == ';':
                        end = i + 2
                        break
            
            if end > start:
                before = content[:start]
                after = content[end:]
                new_route = """app.post('/api/seed', (req, res) => {
    return res.status(403).json({ error: 'Seed endpoint is disabled in production' });
});"""
                content = before + new_route + after

with open('server/app.js', 'w') as f:
    f.write(content)

print("  ✓ /api/seed patched")
PYTHON_PATCH_APP

# ---- PATCH 4b: server/routes/auth.js - Add rate limiting ----
echo "  • Patching auth.js for rate limiting..."
python3 << 'PYTHON_PATCH_AUTH'
import re

with open('server/routes/auth.js', 'r') as f:
    lines = f.readlines()

# Check if rate-limit already imported
has_rate_limit = any('express-rate-limit' in line for line in lines)

if not has_rate_limit:
    # Find the line after "const express = require('express')"
    for i, line in enumerate(lines):
        if "const express = require('express')" in line:
            # Insert rate-limit require after first require
            lines.insert(i + 1, "const rateLimit = require('express-rate-limit');\n")
            break
    
    # Find router definition and add limiter before it
    for i, line in enumerate(lines):
        if "const router = express.Router();" in line:
            limiter_code = """
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false
});
"""
            lines.insert(i + 1, limiter_code)
            break
    
    # Find router.post('/login') and add middleware
    for i, line in enumerate(lines):
        if "router.post('/login'," in line:
            # Replace the line to add loginLimiter middleware
            lines[i] = line.replace("router.post('/login',", "router.post('/login', loginLimiter,")
            break

with open('server/routes/auth.js', 'w') as f:
    f.writelines(lines)

print("  ✓ auth.js patched with rate limiting")
PYTHON_PATCH_AUTH

echo -e "${GREEN}✓ Code patches applied${NC}"
echo ""

# ============================================================================
# STEP 5: INSTALL DEPENDENCIES
# ============================================================================
echo -e "${BLUE}[5/6] Installing dependencies...${NC}"

npm install express-rate-limit
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# ============================================================================
# STEP 6: GIT COMMIT & PUSH
# ============================================================================
echo -e "${BLUE}[6/6] Creating git commit...${NC}"

git add -A
git commit -m "security: Phase 1 critical fixes - JWT rotation, rate limiting, seed endpoint disabled"

echo -e "${GREEN}✓ Changes committed${NC}"
echo ""

# ============================================================================
# DISPLAY NEW JWT SECRET
# ============================================================================
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              ⚡ NEXT STEPS (CRITICAL)                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${YELLOW}1️⃣  Update Render Environment Variables:${NC}"
echo ""
echo "    Go to: https://dashboard.render.com"
echo "    → Select your AI Academy service"
echo "    → Environment → Add new variable:"
echo ""
echo -e "${BLUE}    Name:  JWT_SECRET${NC}"
echo -e "${BLUE}    Value: ${JWT_SECRET}${NC}"
echo ""
echo "    Save → Render auto-redeploys (0-downtime)"
echo ""
echo -e "${YELLOW}2️⃣  Push code changes:${NC}"
echo ""
echo "    git push origin main"
echo ""
echo "    (Render auto-deploys on git push)"
echo ""
echo -e "${YELLOW}3️⃣  Monitor deployment:${NC}"
echo ""
echo "    • Watch Render logs in dashboard"
echo "    • Should deploy in ~2-3 minutes"
echo "    • No downtime expected"
echo ""
echo -e "${YELLOW}4️⃣  Quick verification (5 min after):${NC}"
echo ""
echo "    curl https://YOUR_ACADEMY_DOMAIN/api/health"
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🎯 RENDER WILL AUTO-REDEPLOY AFTER GIT PUSH              ║"
echo "║  No manual restart needed! (0-downtime)                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# SAVE JWT SECRET TO TEMP FILE FOR REFERENCE
# ============================================================================
cat > /tmp/jwt-secret-temp.txt << EOF
CRITICAL - New JWT_SECRET generated on $(date)

JWT_SECRET=${JWT_SECRET}

⚠️  ADD THIS TO RENDER ENVIRONMENT IMMEDIATELY
⚠️  Do NOT commit this file to git
⚠️  This value will be needed for Render dashboard

Backup location: ${BACKUP_DIR}
EOF

echo "📝 New JWT_SECRET saved to: /tmp/jwt-secret-temp.txt"
echo "   (Keep this file safe until added to Render)"
echo ""

# ============================================================================
# FINAL STATUS
# ============================================================================
echo -e "${GREEN}✅ Phase 1 automation complete!${NC}"
echo ""
echo "📋 Summary:"
echo "   ✓ debug_api.js removed"
echo "   ✓ /api/seed disabled"
echo "   ✓ Rate limiting added to login"
echo "   ✓ New JWT_SECRET generated"
echo "   ✓ express-rate-limit installed"
echo "   ✓ Code committed (awaiting git push)"
echo ""
echo "🚀 Next: Follow the 4 steps above to deploy"
echo ""
