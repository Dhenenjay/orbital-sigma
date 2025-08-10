# Health Check Script for orbital-sigma
# Run this script to verify all services are properly configured

Write-Host "" 
Write-Host "ORBITAL SIGMA HEALTH CHECK" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Check Node.js
Write-Host ""
Write-Host "Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "[OK] Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Node.js not found" -ForegroundColor Red
}

# Check Python
Write-Host ""
Write-Host "Checking Python..." -ForegroundColor Yellow
$pythonVersion = python --version 2>$null
if ($pythonVersion) {
    Write-Host "[OK] Python: $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Python not found" -ForegroundColor Red
}

# Check Frontend dependencies
Write-Host ""
Write-Host "Checking Frontend..." -ForegroundColor Yellow
if (Test-Path "frontend/node_modules") {
    Write-Host "[OK] Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "[WARN] Frontend dependencies not installed. Run: npm install -C ./frontend" -ForegroundColor Yellow
}

# Check Backend dependencies
Write-Host ""
Write-Host "Checking Backend..." -ForegroundColor Yellow
if (Test-Path "backend/node_modules") {
    Write-Host "[OK] Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "[WARN] Backend dependencies not installed. Run: npm install -C ./backend" -ForegroundColor Yellow
}

# Check Convex configuration
if (Test-Path "backend/.env.local") {
    Write-Host "[OK] Convex configured (.env.local exists)" -ForegroundColor Green
} else {
    Write-Host "[WARN] Convex not configured. Run: npx convex dev --once --configure=new -C ./backend" -ForegroundColor Yellow
}

# Check Python virtual environment
Write-Host ""
Write-Host "Checking Geo-service..." -ForegroundColor Yellow
if (Test-Path "geo-service/.venv") {
    Write-Host "[OK] Python virtual environment exists" -ForegroundColor Green
    
    # Check if dependencies are installed
    $pipList = & geo-service/.venv/Scripts/pip list 2>$null
    if ($pipList -match "fastapi") {
        Write-Host "[OK] Geo-service dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Geo-service dependencies not installed. Run installation commands from README" -ForegroundColor Yellow
    }
} else {
    Write-Host "[WARN] Python virtual environment not found" -ForegroundColor Yellow
}

# Check data files
Write-Host ""
Write-Host "Checking Data Files..." -ForegroundColor Yellow
if ((Test-Path "data/aois.json") -and (Test-Path "data/instrumentMap.json")) {
    Write-Host "[OK] Data files present" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Data files missing in /data directory" -ForegroundColor Red
}

# Check environment configuration
Write-Host ""
Write-Host "Checking Environment Configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "[OK] .env file exists" -ForegroundColor Green
} else {
    Write-Host "[WARN] .env file not found. Copy .env.example to .env and configure" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Health check complete!" -ForegroundColor Cyan

# Summary
Write-Host ""
Write-Host "SUMMARY:" -ForegroundColor Magenta
Write-Host "To start the services, run these in separate terminals:" -ForegroundColor White
Write-Host "1. Frontend: npm run dev -C ./frontend" -ForegroundColor Gray
Write-Host "2. Backend:  npx convex dev -C ./backend" -ForegroundColor Gray
Write-Host "3. Geo-service: ./geo-service/.venv/Scripts/python.exe -m uvicorn main:app --reload --app-dir ./geo-service --port 8000" -ForegroundColor Gray
