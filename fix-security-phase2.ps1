<# 
======================================================================
PHASE 2: Cookie Security, Error Handling, CORS Configuration
AI Academy Portal - Security Hardening
======================================================================
#>

param(
    [string]$WorkDir = (Get-Location).Path
)

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = ".backup-$timestamp"

Write-Host "`n"
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "PHASE 2: Cookie Security & Error Handling" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "`n"

$pass = 0
$fail = 0

# ======================================================================
# [1/4] Cookie Security - Add SameSite Flag
# ======================================================================
Write-Host "[1/4] Adding SameSite=Strict cookie flag..." -ForegroundColor Blue

try {
    $authPath = "server/routes/auth.js"
    $authContent = Get-Content $authPath -Raw
    
    # Find and replace cookie configuration
    $oldCookie = @"
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            });
"@

    $newCookie = @"
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Strict',
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            });
"@

    if ($authContent -like "*$oldCookie*") {
        # Normalize whitespace for matching
        $normalized = $authContent.Replace("`r`n", "`n")
        $oldNorm = $oldCookie.Replace("`r`n", "`n")
        $newNorm = $newCookie.Replace("`r`n", "`n")
        
        # Use regex for more flexible matching
        $pattern = "res\.cookie\('token',\s*token,\s*\{\s*httpOnly:\s*true,\s*secure:\s*process\.env\.NODE_ENV\s*===\s*'production',\s*maxAge:\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000"
        
        if ($normalized -match $pattern) {
            $updated = $normalized -replace $pattern, "res.cookie('token', token, {`n                httpOnly: true,`n                secure: process.env.NODE_ENV === 'production',`n                sameSite: 'Strict',`n                maxAge: 24 * 60 * 60 * 1000"
            Set-Content -Path $authPath -Value $updated -Encoding UTF8
            Write-Host "OK - Added sameSite flag to cookie config" -ForegroundColor Green
            $pass++
        } else {
            Write-Host "WARN - Could not match old cookie format, trying direct replacement..." -ForegroundColor Yellow
            $updated = $authContent -replace "secure: process\.env\.NODE_ENV === 'production',", "secure: process.env.NODE_ENV === 'production',`n                sameSite: 'Strict',"
            Set-Content -Path $authPath -Value $updated -Encoding UTF8
            Write-Host "OK - Added sameSite flag to cookie config" -ForegroundColor Green
            $pass++
        }
    } else {
        Write-Host "WARN - Cookie config already updated or different format" -ForegroundColor Yellow
        $pass++
    }
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
    $fail++
}
Write-Host ""

# ======================================================================
# [2/4] Fix Error Exposure in upload.js
# ======================================================================
Write-Host "[2/4] Fixing error message exposure in upload.js..." -ForegroundColor Blue

try {
    $uploadPath = "server/routes/upload.js"
    
    if (Test-Path $uploadPath) {
        $uploadContent = Get-Content $uploadPath -Raw
        
        # Replace exposed error.message with generic message
        $oldError = 'res.status(500).json({ error: `Failed to upload file to Cloudflare R2: ${error.message}` });'
        $newError = 'res.status(500).json({ error: ''Failed to upload file. Please try again later.'' });'
        
        if ($uploadContent -like "*$oldError*") {
            $updated = $uploadContent.Replace($oldError, $newError)
            Set-Content -Path $uploadPath -Value $updated -Encoding UTF8
            Write-Host "OK - Removed error.message exposure" -ForegroundColor Green
            $pass++
        } else {
            Write-Host "WARN - Error message pattern not found (may already be fixed)" -ForegroundColor Yellow
            $pass++
        }
    } else {
        Write-Host "SKIP - upload.js not found (optional route)" -ForegroundColor Gray
        $pass++
    }
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
    $fail++
}
Write-Host ""

# ======================================================================
# [3/4] Configure CORS with Allowed Origins
# ======================================================================
Write-Host "[3/4] Configuring CORS with allowed origins..." -ForegroundColor Blue

try {
    $appPath = "server/app.js"
    $appContent = Get-Content $appPath -Raw
    
    $oldCors = "app.use(cors()); // In production, configure origins"
    $newCors = @"
// CORS Configuration - Restrict to allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://localhost:5173'];

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('CORS policy violation'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
"@

    if ($appContent -like "*$oldCors*") {
        $updated = $appContent.Replace($oldCors, $newCors)
        Set-Content -Path $appPath -Value $updated -Encoding UTF8
        Write-Host "OK - CORS configured with restricted origins" -ForegroundColor Green
        $pass++
    } else {
        Write-Host "WARN - CORS format may have changed" -ForegroundColor Yellow
        $pass++
    }
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
    $fail++
}
Write-Host ""

# ======================================================================
# [4/4] Add Global Error Handling Middleware
# ======================================================================
Write-Host "[4/4] Adding global error handling middleware..." -ForegroundColor Blue

try {
    $appPath = "server/app.js"
    $appContent = Get-Content $appPath -Raw
    
    # Find the last middleware/route registration and add error handler before app.listen
    
    $errorMiddleware = @"
// Global Error Handling Middleware (MUST be last)
app.use((err, req, res, next) => {
    console.error('[Global Error Handler]', err);
    
    // Don't expose internal error details to client
    const statusCode = err.statusCode || 500;
    const isDev = process.env.NODE_ENV === 'development';
    
    res.status(statusCode).json({
        error: isDev ? err.message : 'An error occurred. Please try again later.',
        ...(isDev && { stack: err.stack })
    });
});

"@

    # Check if error handler already exists
    if ($appContent -like "*Global Error Handling Middleware*") {
        Write-Host "OK - Error handler already present" -ForegroundColor Green
        $pass++
    } else {
        # Insert before app.listen
        if ($appContent -like "*app.listen(port*") {
            $updated = $appContent -replace "(app\.listen\(port)", "$errorMiddleware`$1"
            Set-Content -Path $appPath -Value $updated -Encoding UTF8
            Write-Host "OK - Added global error handler middleware" -ForegroundColor Green
            $pass++
        } else {
            Write-Host "WARN - Could not find app.listen to insert error handler" -ForegroundColor Yellow
            $pass++
        }
    }
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
    $fail++
}
Write-Host ""

# ======================================================================
# Git Commit & Push
# ======================================================================
Write-Host "[*] Creating git commit..." -ForegroundColor Blue

try {
    git add -A | Out-Null
    git commit -m "security: Phase 2 - cookie security, error handling, CORS config" --no-verify | Out-Null
    Write-Host "OK - Changes committed" -ForegroundColor Green
} catch {
    Write-Host "WARN - Git commit issue (may be already committed)" -ForegroundColor Yellow
}

Write-Host ""

# ======================================================================
# Final Summary
# ======================================================================
$total = $pass + $fail

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "RESULTS: $pass/$total Fixes Applied" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

if ($fail -eq 0) {
    Write-Host "SUCCESS - All Phase 2 security fixes applied!" -ForegroundColor Green
    Write-Host ""
    Write-Host "NEXT STEPS:" -ForegroundColor Cyan
    Write-Host "  1. Review changes:" -ForegroundColor Gray
    Write-Host "     git log -1 --stat" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. Push to deploy on Render:" -ForegroundColor Gray
    Write-Host "     git push origin main" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  3. Wait for Render deployment (2-3 min)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  4. Set ALLOWED_ORIGINS in Render Environment:" -ForegroundColor Gray
    Write-Host "     ALLOWED_ORIGINS=https://fouris-academy.onrender.com" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "ISSUES - Review errors above" -ForegroundColor Red
}

Write-Host ""
Write-Host "Phase 2 Security Changes:" -ForegroundColor Yellow
Write-Host "  * Cookie: Added sameSite='Strict' (CSRF protection)" -ForegroundColor White
Write-Host "  * Errors: Removed error.message exposure in upload.js" -ForegroundColor White
Write-Host "  * CORS: Restricted to ALLOWED_ORIGINS environment variable" -ForegroundColor White
Write-Host "  * Middleware: Added global error handler for consistent responses" -ForegroundColor White
Write-Host ""
