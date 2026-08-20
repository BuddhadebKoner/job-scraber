# Test Setup Script - Verifies prerequisites and configuration

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Job Scraping App - Setup Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js installed: $nodeVersion" -ForegroundColor Green
    
    # Check if version is 20+
    $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($versionNumber -lt 20) {
        Write-Host "  ⚠ Warning: Node.js 20+ recommended (you have $nodeVersion)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ Node.js not found!" -ForegroundColor Red
    Write-Host "  Install from: https://nodejs.org/" -ForegroundColor Yellow
    $allGood = $false
}
Write-Host ""

# Check pnpm
Write-Host "Checking pnpm..." -ForegroundColor Yellow
try {
    $pnpmVersion = pnpm --version
    Write-Host "✓ pnpm installed: $pnpmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ pnpm not found!" -ForegroundColor Red
    Write-Host "  Install with: npm install -g pnpm" -ForegroundColor Yellow
    $allGood = $false
}
Write-Host ""

# Check Docker
Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "✓ Docker installed: $dockerVersion" -ForegroundColor Green
    
    # Check if Docker is running
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Docker is running" -ForegroundColor Green
    } else {
        Write-Host "✗ Docker is not running!" -ForegroundColor Red
        Write-Host "  Please start Docker Desktop" -ForegroundColor Yellow
        $allGood = $false
    }
} catch {
    Write-Host "✗ Docker not found!" -ForegroundColor Red
    Write-Host "  Install from: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    $allGood = $false
}
Write-Host ""

# Check if dependencies are installed
Write-Host "Checking project dependencies..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "✓ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠ Dependencies not installed" -ForegroundColor Yellow
    Write-Host "  Run: pnpm install" -ForegroundColor Yellow
}
Write-Host ""

# Check configuration files
Write-Host "Checking configuration files..." -ForegroundColor Yellow

if (Test-Path "docker-compose.yml") {
    Write-Host "✓ docker-compose.yml exists" -ForegroundColor Green
} else {
    Write-Host "✗ docker-compose.yml missing!" -ForegroundColor Red
    $allGood = $false
}

if (Test-Path "artifacts/api-server/Dockerfile") {
    Write-Host "✓ Dockerfile exists" -ForegroundColor Green
} else {
    Write-Host "✗ Dockerfile missing!" -ForegroundColor Red
    $allGood = $false
}

if (Test-Path "artifacts/jobhunt/.env.local") {
    Write-Host "✓ Frontend .env.local exists" -ForegroundColor Green
} else {
    Write-Host "⚠ Frontend .env.local missing (will be created)" -ForegroundColor Yellow
}
Write-Host ""

# Check ports
Write-Host "Checking port availability..." -ForegroundColor Yellow

$port8080 = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
if ($port8080) {
    Write-Host "⚠ Port 8080 is in use" -ForegroundColor Yellow
    Write-Host "  Backend may fail to start" -ForegroundColor Yellow
} else {
    Write-Host "✓ Port 8080 is available" -ForegroundColor Green
}

$port5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if ($port5173) {
    Write-Host "⚠ Port 5173 is in use" -ForegroundColor Yellow
    Write-Host "  Frontend may fail to start" -ForegroundColor Yellow
} else {
    Write-Host "✓ Port 5173 is available" -ForegroundColor Green
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "✓ All checks passed!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "You're ready to start the application!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor White
    Write-Host "1. Run: .\start-dev.ps1" -ForegroundColor Cyan
    Write-Host "   OR" -ForegroundColor White
    Write-Host "2. Run manually:" -ForegroundColor White
    Write-Host "   docker-compose up -d --build" -ForegroundColor Cyan
    Write-Host "   pnpm --filter @workspace/jobhunt run dev" -ForegroundColor Cyan
} else {
    Write-Host "✗ Some checks failed" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Please fix the issues above before starting" -ForegroundColor Yellow
}
Write-Host ""
