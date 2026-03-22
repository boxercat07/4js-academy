# Render Environment Configuration

## Current Environment Variables (Check These)

Your app on Render should have these variables set:

### Required (MUST have):
```
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/dbname
JWT_SECRET=<will be updated by Phase 1>
NODE_ENV=production
```

### Optional (AWS S3/Cloudflare R2):
```
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
R2_PUBLIC_URL=...
```

---

## How to Check Current Environment in Render

1. **Log into Render Dashboard:** https://dashboard.render.com
2. **Select your service:** "ai-academy" or similar
3. **Go to:** Settings → Environment
4. **You should see:**
   - DATABASE_URL (from Neon.tech)
   - JWT_SECRET (current value)
   - NODE_ENV
   - Any R2/AWS keys

---

## Phase 1 Update Process

### Option 1: Copy-Paste (Easiest for Solo Dev)

```
1. Run: bash fix-security-phase1.sh
2. Copy the NEW JWT_SECRET from output
3. Go to Render dashboard Settings → Environment
4. Find: JWT_SECRET
5. Paste new value
6. Click "Save"
7. Run: git push origin main
8. Monitor deploy completion (2-3 min)
```

### Option 2: .env File (If you want to commit)

```bash
# Edit local .env
nano .env
JWT_SECRET=YOUR_NEW_VALUE_HERE
```

Then:
```bash
git add .env
git commit -m "security: rotate JWT_SECRET"
git push origin main
```

Render auto-detects and redeploys.

### Option 3: Render CLI (If installed)

```bash
# Install Render CLI first
npm install -g render

# Or use direct update
render env:set JWT_SECRET="your_new_secret"
```

---

## Important: .env vs Environment Variables

### For Render.com (Production):
- **Use:** Render Dashboard Environment Variables
- **NOT:** .env file in git

### For Local Dev:
- **Use:** .env file
- **Store:** In .gitignore

---

## Verify Variables Are Set

After updating Render environment, verify:

```bash
# These should work after deploy
curl https://YOUR_DOMAIN.onrender.com/api/health

# If database connected:
curl -X POST https://YOUR_DOMAIN.onrender.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@4js.com","password":"test"}'
# Should return valid response, not error about JWT_SECRET
```

---

## Environment Variable Order of Precedence

In Node.js with dotenv:

```
1. Process environment (Render environment vars) - HIGHEST
2. .env file in root directory
3. Hardcoded defaults (i.e., 'ai-academy-super-secret-key-for-dev')
4. Error (if no value found) - LOWEST
```

**After Phase 1:** Hardcoded default is removed, so must have value in Render.

---

## If Deploy Fails After Env Update

**Common issue:** DATABASE_URL not set or invalid

```bash
# Check Render logs
https://dashboard.render.com → Logs

Look for:
- "DATABASE_URL" undefined
- "connection refused" 
- Neon.tech timeout

Fix:
1. Verify DATABASE_URL in Environment
2. Check Neon.tech database is accessible
3. Confirm credentials are correct
4. Try manual reconnect
```

---

## Neon.tech Integration

Your database is managed by Neon.tech:

```
Service: PostgreSQL on Neon.tech
Location: Format is: postgresql://...neon.tech/...
Connection pooling: Built-in
Pricing: Serverless (scales automatically)
```

Render + Neon = Perfect pair:
- ✅ Both serverless
- ✅ Same pricing model
- ✅ Auto-scaling
- ✅ No management needed

---

## After Phase 1 Deployment

Once Render shows "Live" status:

```bash
# Verify database still works
npm test  # If you have tests
```

Or manually query:
```bash
curl https://your-domain/api/me
# Should get 401 (unauthenticated) not DB error
```

---

## Environment Variable Security Best Practices

✅ **DO:**
- Store secrets in Render Dashboard only
- Rotate JWT_SECRET regularly
- Use strong random values (crypto.randomBytes)
- Never commit secrets to git
- Use different keys for prod vs staging

❌ **DON'T:**
- Store secrets in .env and commit to git
- Use weak/hardcoded values
- Share environment variable values in messages
- Expose secrets in logs
- Use same JWT_SECRET for multiple services

---

## Health Check After Deployment

```bash
# Test these endpoints
curl https://your-domain/api/health
# → Should return: {"status":"ok","message":"..."}

curl -X POST https://your-domain/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@4js.com","password":"wrong"}'
# → Should return: 401 Unauthorized (not 500 error)

curl -X POST https://your-domain/api/seed
# → Should return: 403 (disabled)
```

All three = ✅ Good health

---

## Rollback if Needed

If deployment breaks:

```bash
# Revert code changes
git revert HEAD
git push

# Update JWT_SECRET back to old value in Render
# Render auto-redeploys (watch Deploys tab)
```

---

**Questions about Render setup? Check:**
- Render docs: https://render.com/docs
- Neon docs: https://neon.tech/docs
- Node.js & dotenv: https://github.com/motdotla/dotenv
