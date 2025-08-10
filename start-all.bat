@echo off
echo ========================================
echo Starting Orbital Sigma Full Stack
echo ========================================
echo.

echo [1/3] Starting Frontend Server...
start "Frontend - Orbital Sigma" cmd /k "cd /d C:\Users\Dhenenjay\orbital-sigma\frontend && npm run dev"

timeout /t 2 /nobreak > nul

echo [2/3] Starting Convex Backend...
start "Convex Backend - Orbital Sigma" cmd /k "cd /d C:\Users\Dhenenjay\orbital-sigma\backend && npx convex dev"

timeout /t 2 /nobreak > nul

echo [3/3] Starting Geo-Service (if available)...
if exist "C:\Users\Dhenenjay\orbital-sigma\geo-service" (
    start "Geo-Service - Orbital Sigma" cmd /k "cd /d C:\Users\Dhenenjay\orbital-sigma\geo-service && venv\Scripts\activate && python -m uvicorn app:app --reload --port 8000"
) else (
    echo Geo-service not found, skipping...
)

echo.
echo ========================================
echo All services are starting!
echo ========================================
echo.
echo Services available at:
echo   Frontend:    http://localhost:3000 (or 3001 if 3000 is busy)
echo   Convex:      See terminal for URL
echo   Geo-Service: http://localhost:8000
echo.
echo Press any key to close this window...
pause > nul
