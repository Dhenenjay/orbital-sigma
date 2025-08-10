# Orbital Sigma - Start All Services
# This script opens all required services in separate terminals

Write-Host "Starting Orbital Sigma Full Stack..." -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan

# Terminal 1: Frontend (Next.js)
Write-Host "`n[1/3] Starting Frontend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\Users\Dhenenjay\orbital-sigma\frontend; Write-Host 'Starting Frontend on http://localhost:3000' -ForegroundColor Green; npm run dev"

Start-Sleep -Seconds 2

# Terminal 2: Backend (Convex)
Write-Host "[2/3] Starting Convex Backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\Users\Dhenenjay\orbital-sigma\backend; Write-Host 'Starting Convex Development Server' -ForegroundColor Green; npx convex dev"

Start-Sleep -Seconds 2

# Terminal 3: Geo-Service (Python/FastAPI)
Write-Host "[3/3] Starting Geo-Service..." -ForegroundColor Yellow
$geoServicePath = "C:\Users\Dhenenjay\orbital-sigma\geo-service"
if (Test-Path $geoServicePath) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $geoServicePath; Write-Host 'Starting Geo-Service on http://localhost:8000' -ForegroundColor Green; if (Test-Path 'venv\Scripts\activate.ps1') { .\venv\Scripts\activate; python -m uvicorn app:app --reload --port 8000 } else { Write-Host 'Virtual environment not found. Please set up geo-service first.' -ForegroundColor Red }"
} else {
    Write-Host "Geo-service directory not found. Skipping..." -ForegroundColor Red
}

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "All services starting!" -ForegroundColor Green
Write-Host "`nServices will be available at:" -ForegroundColor White
Write-Host "  - Frontend:    http://localhost:3000" -ForegroundColor Cyan
Write-Host "  - Convex:      Check terminal for URL" -ForegroundColor Cyan
Write-Host "  - Geo-Service: http://localhost:8000" -ForegroundColor Cyan
Write-Host "`nNote: Services may take a few moments to fully start." -ForegroundColor Yellow
Write-Host "Check each terminal window for status." -ForegroundColor Yellow
