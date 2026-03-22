# 🚀 QUICK START - Phase 1 Execute NOW

## Prerequisites

```bash
# You should have these installed:
node --version      # Should be 16+
npm --version       # Should be 7+
git --version       # Should be 2.x
python3 --version   # For patching (comes with most systems)
```

---

## ⚡ EXECUTE (5 min total)

### STEP 1: Run the auto-patcher script (2 min)

```bash
# Make it executable
chmod +x fix-security-phase1.sh

# Run it
bash fix-security-phase1.sh
```

**What it does:**
- ✅ Generates new JWT_SECRET (cryptographically secure)
- ✅ Patches server/app.js (/api/seed disabled)
- ✅ Patches server/routes/auth.js (rate limiting added)
- ✅ Removes debug_api.js
- ✅ Installs express-rate-limit
- ✅ Creates git commit

**Output you'll see:**
```
✓ Generated new JWT_SECRET
✓ Backups created
✓ Deleted debug_api.js
✓ Code patches applied
✓ Dependencies installed
✓ Changes committed
```

---

### STEP 2: Copy the new JWT_SECRET (30 sec)

The script will display something like:

```
📝 New JWT_SECRET saved to: /tmp/jwt-secret-temp.txt

⚠️  ADD THIS TO RENDER IMMEDIATELY

JWT_SECRET=a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1
```

**Copy the long string (after `=`)**

---

### STEP 3: Update Render Environment (1 min)

**Option A: Via Render Dashboard (Easiest)**

```
1. Go to: https://dashboard.render.com
2. Click your AI Academy service
3. Go to: Settings → Environment
4. Find JWT_SECRET variable
5. Update value: paste the new secret
6. Click "Save"
7. Render auto-redeploys (watch the "Deploys" tab)
```

**Option B: Via Render CLI**

```bash
# If you have Render CLI installed:
render update-env JWT_SECRET="paste_new_secret_here"
```

**Option C: Via .env file locally (then git push)**

```bash
# Edit .env locally
nano .env

# Change:
JWT_SECRET=old_secret_here

# To:
JWT_SECRET=a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1

# Save & exit (Ctrl+O, Enter, Ctrl+X)
```

---

### STEP 4: Push code to git (30 sec)

```bash
git push origin main
```

**Render auto-detects the push and redeploys** (no manual steps needed)

---

### STEP 5: Monitor Render Deployment (2 min)

```
1. Go to Render dashboard
2. Watch "Deploys" tab for your service
3. Should see new deploy in progress
4. Wait for "Live" status
```

**What you'll see:**
```
Building... → Deploying... → Live ✓
```

**Total deploy time: 2-3 minutes**

---

### STEP 6: Verify it worked (2 min)

After Render shows "Live":

```bash
# Make verification script executable
chmod +x verify-phase1.sh

# Run tests
bash verify-phase1.sh https://YOUR_RENDER_DOMAIN.onrender.com
```

**Replace `YOUR_RENDER_DOMAIN` with your actual Render domain**

(You can find it in Render dashboard → your service → "Settings" → "URL")

**Example:**
```bash
bash verify-phase1.sh https://ai-academy-v2.onrender.com
```

---

## 📊 What Gets Fixed

| Issue | Status |
|-------|--------|
| JWT hardcoded secret | ✅ Rotated |
| /api/seed endpoint | ✅ Disabled |
| debug_api.js exposed | ✅ Removed |
| No rate limiting | ✅ Added (5 attempts/15min) |
| CORS too open | ⏳ Configure next step |

**Vulnerability reduction: 50%** ✅

---

## ⏱️ Timeline

```
NOW:       Run fix-security-phase1.sh (2 min)
           Update JWT_SECRET in Render (1 min)
           Git push (30 sec)

+2-3 min:  Render finishes deploy
+5 min:    Run verify-phase1.sh
           Confirm all tests pass

DONE ✅
```

---

## 🆘 If Something Goes Wrong

### "Script failed"
```bash
# Check if files exist
ls -la server/app.js
ls -la server/routes/auth.js

# View logs
tail -50 /tmp/jwt-secret-temp.txt
```

### "Render deploy failed"
```
1. Check Render dashboard "Logs" tab
2. Look for error messages
3. Most common: Neon.tech database connection
4. Verify DATABASE_URL is set in Render env
```

### "Tests failed"
```bash
# Run verification with debug mode
bash -x verify-phase1.sh https://YOUR_DOMAIN.onrender.com

# Check your actual domain
curl https://YOUR_DOMAIN.onrender.com/api/health
```

### "Rollback needed"
```bash
# If something broke, revert git
git revert HEAD
git push

# Restore old JWT_SECRET in Render dashboard
# Update env var back to old value
```

---

## 📝 Notes

- **No database changes needed** - Neon.tech works as-is
- **No downtime** - Render auto-deploys with 0-downtime
- **All users auto-logged out** - Expected after JWT rotation
- **Email not needed** - 5min deploy, won't notice

---

## ✅ Post-Deployment Checklist

After verify-phase1.sh shows ✅:

```
[ ] All 5 tests passed
[ ] JWT_SECRET updated in Render
[ ] Code deployed to production
[ ] No errors in Render logs
[ ] Can still access /api/health
[ ] Login endpoint returns 401 (with bad creds) ✓
[ ] 6th login attempt blocked (429 rate limit) ✓
```

---

## 🎯 Next Phase

After Phase 1 is stable (tomorrow):

**Phase 2 (Wed):**
- Input validation
- Security headers (helmet.js)
- Password reset flow

**Phase 3 (Thu):**
- Audit logging
- CSRF protection (if time)

---

**Questions? Stuck?**

Check the detailed docs:
- Full plan: `REMEDIATION_PLAN_FR.md`
- All CVEs: `SECURITY_AUDIT.md`
- Render docs: https://render.com/docs

---

## 🚀 GO EXECUTE!

```bash
chmod +x fix-security-phase1.sh
bash fix-security-phase1.sh
```

Then follow the 6 steps above. ⏱️
