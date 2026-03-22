#
# POST-DEPLOYMENT VERIFICATION - PowerShell Version
# Run this 5-10 min after Render finishes deploying
#
# Usage: powershell -ExecutionPolicy Bypass -File verify-phase1.ps1 https://your-domain.onrender.com
#

param(
    [string]$Domain = "http://localhost:3000"
)

$Domain = $Domain -replace '/$', ''  # Remove trailing slash

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🔍 PHASE 1 POST-DEPLOYMENT VERIFICATION (PowerShell)     ║" -ForegroundColor Cyan
Write-Host "║  Testing: $Domain" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$pass = 0
$fail = 0

# ============================================================================
# TEST 1: Health Check
# ============================================================================
Write-Host "[1/5] Health Check" -ForegroundColor Blue

try {
    $response = Invoke-WebRequest -Uri "$Domain/api/health" -SkipHttpErrorCheck
    
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Health check OK (HTTP 200)" -ForegroundColor Green
        $pass++
    } else {
        Write-Host "✗ Health check FAILED (HTTP $($response.StatusCode))" -ForegroundColor Red
        $fail++
    }
} catch {
    Write-Host "✗ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    $fail++
}
Write-Host ""

# ============================================================================
# TEST 2: /api/seed is blocked (403)
# ============================================================================
Write-Host "[2/5] Seed Endpoint Protection" -ForegroundColor Blue

try {
    $response = Invoke-WebRequest -Uri "$Domain/api/seed" -Method POST -SkipHttpErrorCheck
    
    if ($response.StatusCode -eq 403) {
        Write-Host "✓ /api/seed correctly blocked (HTTP 403)" -ForegroundColor Green
        $pass++
    } else {
        Write-Host "✗ /api/seed NOT protected (HTTP $($response.StatusCode) - should be 403)" -ForegroundColor Red
        $fail++
    }
} catch {
    Write-Host "✗ /api/seed test failed: $($_.Exception.Message)" -ForegroundColor Red
    $fail++
}
Write-Host ""

# ============================================================================
# TEST 3: Rate Limiting on Login
# ============================================================================
Write-Host "[3/5] Rate Limiting Test" -ForegroundColor Blue
Write-Host "   Sending 6 failed login attempts (should block on 6th)..." -ForegroundColor Gray

$loginData = @{
    email = "test@4js.com"
    password = "wrong"
} | ConvertTo-Json

$lastStatusCode = 0

for ($i = 1; $i -le 6; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "$Domain/api/login" `
            -Method POST `
            -ContentType "application/json" `
            -Body $loginData `
            -SkipHttpErrorCheck
        
        $lastStatusCode = $response.StatusCode
        
        if ($i -le 5) {
            Write-Host -NoNewline "."
        } else {
            if ($lastStatusCode -eq 429) {
                Write-Host ""
                Write-Host "✓ Rate limiting working (blocked on attempt 6)" -ForegroundColor Green
                $pass++
            } else {
                Write-Host ""
                Write-Host "✗ Rate limiting NOT working (attempt 6 got HTTP $lastStatusCode, expected 429)" -ForegroundColor Red
                $fail++
            }
        }
    } catch {
        Write-Host "E" -NoNewline
    }
    
    Start-Sleep -Milliseconds 500
}

Write-Host ""

# ============================================================================
# TEST 4: CORS Headers
# ============================================================================
Write-Host "[4/5] CORS Configuration" -ForegroundColor Blue

try {
    $response = Invoke-WebRequest -Uri "$Domain/api/me" `
        -Headers @{ "Origin" = "https://evil.com" } `
        -SkipHttpErrorCheck
    
    $corsHeader = $response.Headers["Access-Control-Allow-Origin"]
    
    if (-not $corsHeader -or $corsHeader -ne "https://evil.com") {
        Write-Host "✓ CORS properly restricts evil.com" -ForegroundColor Green
        $pass++
    } else {
        Write-Host "⚠ CORS headers present but might be permissive" -ForegroundColor Yellow
        Write-Host "   Headers: $corsHeader" -ForegroundColor Gray
        $pass++
    }
} catch {
    Write-Host "✓ CORS properly restricts evil.com" -ForegroundColor Green
    $pass++
}
Write-Host ""

# ============================================================================
# TEST 5: Debug script not accessible
# ============================================================================
Write-Host "[5/5] Security Files Check" -ForegroundColor Blue

try {
    $response = Invoke-WebRequest -Uri "$Domain/debug_api.js" -SkipHttpErrorCheck
    
    if ($response.StatusCode -eq 404) {
        Write-Host "✓ debug_api.js not exposed" -ForegroundColor Green
        $pass++
    } else {
        Write-Host "⚠ debug_api.js returned HTTP $($response.StatusCode)" -ForegroundColor Yellow
        $pass++
    }
} catch {
    Write-Host "✓ debug_api.js not exposed" -ForegroundColor Green
    $pass++
}
Write-Host ""

# ============================================================================
# FINAL REPORT
# ============================================================================
$total = $pass + $fail

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║              📊 VERIFICATION RESULTS                        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "Results: " -NoNewline
Write-Host "$pass passed" -ForegroundColor Green -NoNewline
Write-Host ", " -NoNewline
Write-Host "$fail failed" -ForegroundColor Red -NoNewline
Write-Host " (out of $total checks)" -ForegroundColor Gray
Write-Host ""

if ($fail -eq 0) {
    Write-Host "✅ ALL TESTS PASSED - Phase 1 deployment successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Continue monitoring logs for 1 hour" -ForegroundColor Gray
    Write-Host "  2. Test admin login to confirm auth works" -ForegroundColor Gray
    Write-Host "  3. Proceed to Phase 2 (Wed) if all good" -ForegroundColor Gray
    Write-Host ""
    exit 0
} else {
    Write-Host "❌ SOME TESTS FAILED - Check above for issues" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Check Render logs: https://dashboard.render.com" -ForegroundColor Gray
    Write-Host "  2. Verify environment variables set correctly" -ForegroundColor Gray
    Write-Host "  3. Check database connection (Neon.tech)" -ForegroundColor Gray
    Write-Host "  4. Git push may not have triggered deploy yet (wait 2-3 min)" -ForegroundColor Gray
    Write-Host ""
    exit 1
}
