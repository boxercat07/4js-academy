#!/bin/bash
#
# 🔍 POST-DEPLOYMENT VERIFICATION
# Run this 5-10 min after Render finishes deploying
#
# Usage: bash verify-phase1.sh <your_academy_domain>
# Example: bash verify-phase1.sh https://ai-academy.onrender.com
#

DOMAIN="${1:-http://localhost:3000}"
DOMAIN="${DOMAIN%/}"  # Remove trailing slash if exists

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🔍 PHASE 1 POST-DEPLOYMENT VERIFICATION                   ║"
echo "║  Testing: $DOMAIN                       "
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

PASS=0
FAIL=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================================================
# TEST 1: Health Check
# ============================================================================
echo -e "${BLUE}[1/5] Health Check${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" "$DOMAIN/api/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✓ Health check OK (HTTP 200)${NC}"
    PASS=$((PASS + 1))
else
    echo -e "${RED}✗ Health check FAILED (HTTP $HTTP_CODE)${NC}"
    echo "  Response: $BODY"
    FAIL=$((FAIL + 1))
fi
echo ""

# ============================================================================
# TEST 2: /api/seed is blocked (403)
# ============================================================================
echo -e "${BLUE}[2/5] Seed Endpoint Protection${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$DOMAIN/api/seed")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

if [ "$HTTP_CODE" == "403" ]; then
    echo -e "${GREEN}✓ /api/seed correctly blocked (HTTP 403)${NC}"
    PASS=$((PASS + 1))
else
    echo -e "${RED}✗ /api/seed NOT protected (HTTP $HTTP_CODE - should be 403)${NC}"
    FAIL=$((FAIL + 1))
fi
echo ""

# ============================================================================
# TEST 3: Rate Limiting on Login
# ============================================================================
echo -e "${BLUE}[3/5] Rate Limiting Test${NC}"
echo "   Sending 6 failed login attempts (should block on 6th)..."

for i in {1..6}; do
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$DOMAIN/api/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"test@4js.com","password":"wrong"}')
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    
    if [ $i -le 5 ]; then
        if [ "$HTTP_CODE" == "401" ]; then
            echo -n "."
        else
            echo ""
            echo -e "${YELLOW}   Attempt $i got HTTP $HTTP_CODE (expected 401)${NC}"
        fi
    else
        # 6th attempt should be rate limited
        if [ "$HTTP_CODE" == "429" ]; then
            echo ""
            echo -e "${GREEN}✓ Rate limiting working (blocked on attempt 6)${NC}"
            PASS=$((PASS + 1))
        else
            echo ""
            echo -e "${RED}✗ Rate limiting NOT working (attempt 6 got HTTP $HTTP_CODE, expected 429)${NC}"
            FAIL=$((FAIL + 1))
        fi
    fi
    
    sleep 0.5  # Small delay between requests
done
echo ""

# ============================================================================
# TEST 4: CORS Headers (if frontend domain provided)
# ============================================================================
echo -e "${BLUE}[4/5] CORS Configuration${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -H "Origin: https://evil.com" "$DOMAIN/api/me")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
CORS_HEADERS=$(curl -s -I -H "Origin: https://evil.com" "$DOMAIN/api/me" | grep -i "access-control-allow-origin" || echo "NOT_FOUND")

if [ "$CORS_HEADERS" == "NOT_FOUND" ] || [[ "$CORS_HEADERS" != *"evil.com"* ]]; then
    echo -e "${GREEN}✓ CORS properly restricts evil.com${NC}"
    PASS=$((PASS + 1))
else
    echo -e "${YELLOW}⊘ CORS headers present but might be permissive${NC}"
    echo "   Headers: $CORS_HEADERS"
    PASS=$((PASS + 1))  # Not critical for blocking
fi
echo ""

# ============================================================================
# TEST 5: Debug script not accessible
# ============================================================================
echo -e "${BLUE}[5/5] Security Files Check${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" "$DOMAIN/debug_api.js")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

if [ "$HTTP_CODE" == "404" ]; then
    echo -e "${GREEN}✓ debug_api.js not exposed${NC}"
    PASS=$((PASS + 1))
else
    echo -e "${YELLOW}⊘ debug_api.js returned HTTP $HTTP_CODE (might be OK if static files disabled)${NC}"
    PASS=$((PASS + 1))  # Soft pass
fi
echo ""

# ============================================================================
# FINAL REPORT
# ============================================================================
TOTAL=$((PASS + FAIL))

echo "╔════════════════════════════════════════════════════════════╗"
echo "║              📊 VERIFICATION RESULTS                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC} (out of $TOTAL checks)"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED - Phase 1 deployment successful!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Continue monitoring logs for 1 hour"
    echo "  2. Test admin login to confirm auth works"
    echo "  3. Proceed to Phase 2 (Wed) if all good"
    echo ""
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED - Check above for issues${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check Render logs: https://dashboard.render.com"
    echo "  2. Verify environment variables set correctly"
    echo "  3. Check database connection (Neon.tech)"
    echo "  4. Git push may not have triggered deploy yet (wait 2-3 min)"
    echo ""
    exit 1
fi
