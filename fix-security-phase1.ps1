#
# AI ACADEMY SECURITY PHASE 1 - PowerShell Version
# Simplified version without special characters
#

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  AI ACADEMY PHASE 1 SECURITY FIXES" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# STEP 1: GENERATE NEW JWT SECRET
Write-Host "[1/5] Generating new JWT_SECRET..." -ForegroundColor Blue

$bytes = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
$buffer = [byte[]]::new(32)
$bytes.GetBytes($buffer)
$JWT_SECRET = [System.BitConverter]::ToString($buffer).Replace("-", "").ToLower()

if (-not $JWT_SECRET) {
    Write-Host "ERROR: Failed to generate JWT_SECRET" -ForegroundColor Red
    exit 1
}

Write-Host "OK - Generated secret (${JWT_SECRET.Length} chars)" -ForegroundColor Green
Write-Host ""

# STEP 2: BACKUP CURRENT STATE
Write-Host "[2/5] Backing up current state..." -ForegroundColor Blue

$backupDir = ".backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# Backup sensitive files
if (Test-Path ".env") { Copy-Item ".env" "$backupDir\.env.backup" }
if (Test-Path "server/app.js") { Copy-Item "server/app.js" "$backupDir\app.js.backup" }
if (Test-Path "server/routes/auth.js") { Copy-Item "server/routes/auth.js" "$backupDir\auth.js.backup" }
if (Test-Path "package.json") { Copy-Item "package.json" "$backupDir\package.json.backup" }

Write-Host "OK - Backups created in $backupDir" -ForegroundColor Green
Write-Host ""

# STEP 3: DELETE DEBUG FILE
Write-Host "[3/5] Removing debug_api.js..." -ForegroundColor Blue

if (Test-Path "debug_api.js") {
    Remove-Item "debug_api.js" -Force
    Write-Host "OK - Deleted debug_api.js" -ForegroundColor Green
}
else {
    Write-Host "SKIP - debug_api.js not found" -ForegroundColor Yellow
}
Write-Host ""

# STEP 4: PATCH CODE FILES
Write-Host "[4/5] Patching code files..." -ForegroundColor Blue

$appJsPath = "server\app.js"
if (Test-Path $appJsPath) {
    Write-Host "  Patching /api/seed endpoint..." -ForegroundColor Gray
    $content = Get-Content $appJsPath -Raw
    
    if ($content -match "app\.post\('/api/seed'") {
        $newRoute = "app.post('/api/seed', (req, res) => { return res.status(403).json({ error: 'Seed endpoint is disabled in production' }); });"
        $pattern = "app\.post\('/api/seed',\s*async\s*\(req,\s*res\)\s*=>.*?^\}\);"
        $content = $content -replace $pattern, $newRoute
        Set-Content $appJsPath $content
        Write-Host "  OK - /api/seed patched" -ForegroundColor Green
    }
}

$authJsPath = "server\routes\auth.js"
if (Test-Path $authJsPath) {
    Write-Host "  Patching auth.js for rate limiting..." -ForegroundColor Gray
    $content = Get-Content $authJsPath -Raw
    
    if ($content -notmatch "express-rate-limit") {
        $content = $content -replace "(const express = require\('express'\);)", "`$1`nconst rateLimit = require('express-rate-limit');"
        
        $limiterCode = "`n`nconst loginLimiter = rateLimit({`n    windowMs: 15 * 60 * 1000,`n    max: 5,`n    message: 'Too many login attempts',`n    skipSuccessfulRequests: true`n});"
        
        $content = $content -replace "(const router = express\.Router\(\);)", "`$1$limiterCode"
        $content = $content -replace "router\.post\('/login',", "router.post('/login', loginLimiter,"
        
        Set-Content $authJsPath $content
        Write-Host "  OK - auth.js patched" -ForegroundColor Green
    }
}

Write-Host "OK - Code patches applied" -ForegroundColor Green
Write-Host ""

# STEP 5: INSTALL DEPENDENCIES
Write-Host "[5/5] Installing dependencies..." -ForegroundColor Blue

npm install express-rate-limit
Write-Host "OK - Dependencies installed" -ForegroundColor Green
Write-Host ""

# GIT COMMIT
Write-Host "Creating git commit..." -ForegroundColor Blue
git add -A
git commit -m "security: Phase 1 critical fixes"
Write-Host "OK - Changes committed" -ForegroundColor Green
Write-Host ""

# DISPLAY NEXT STEPS
Write-Host "=====================================================" -ForegroundColor Yellow
Write-Host "  NEXT STEPS (CRITICAL)" -ForegroundColor Yellow
Write-Host "=====================================================" -ForegroundColor Yellow
Write-Host ""

Write-Host "1. UPDATE RENDER ENVIRONMENT:" -ForegroundColor Yellow
Write-Host "   Go to: https://dashboard.render.com" -ForegroundColor Gray
Write-Host "   -> Click your AI Academy service" -ForegroundColor Gray
Write-Host "   -> Settings > Environment" -ForegroundColor Gray
Write-Host "   -> Find JWT_SECRET and click edit" -ForegroundColor Gray
Write-Host "   -> Copy and paste this value:" -ForegroundColor Gray
Write-Host ""
Write-Host "   $JWT_SECRET" -ForegroundColor Cyan
Write-Host ""
Write-Host "   -> Click Save" -ForegroundColor Gray
Write-Host ""

Write-Host "2. PUSH YOUR CODE:" -ForegroundColor Yellow
Write-Host "   git push origin main" -ForegroundColor Cyan
Write-Host ""

Write-Host "3. WAIT FOR RENDER DEPLOY:" -ForegroundColor Yellow
Write-Host "   Watch your Render dashboard" -ForegroundColor Gray
Write-Host "   Should deploy in 2-3 minutes" -ForegroundColor Gray
Write-Host ""

Write-Host "4. VERIFY AFTER DEPLOY:" -ForegroundColor Yellow
Write-Host "   powershell -ExecutionPolicy Bypass -File verify-phase1.ps1" -ForegroundColor Cyan
Write-Host ""

Write-Host "=====================================================" -ForegroundColor Green
Write-Host "  PHASE 1 COMPLETE" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
Write-Host ""

# Save JWT to temp file
$tempFile = "$env:TEMP\jwt-secret-phase1.txt"
$jwtContent = "JWT_SECRET=$JWT_SECRET`r`nGenerated: $(Get-Date)"

Set-Content $tempFile $jwtContent
Write-Host "JWT Secret saved to: $tempFile" -ForegroundColor Gray
Write-Host ""

# Copy to clipboard
Write-Host "BONUS: JWT_SECRET is in your clipboard!" -ForegroundColor Green
$JWT_SECRET | Set-Clipboard
Write-Host ""
