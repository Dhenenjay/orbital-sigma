@echo off
echo ==========================================
echo    ORBITAL SIGMA - LOCAL TESTING SETUP
echo ==========================================
echo.

echo [1/3] Starting Convex Backend...
cd backend
start cmd /k "npx convex dev"
timeout /t 5 >nul

echo [2/3] Starting Frontend Development Server...
cd ../frontend
start cmd /k "npm run dev"
timeout /t 5 >nul

echo [3/3] Opening Browser...
timeout /t 3 >nul
start http://localhost:3000

echo.
echo ==========================================
echo    SETUP COMPLETE!
echo ==========================================
echo.
echo Services Running:
echo - Convex Backend: https://dashboard.convex.dev/d/wary-duck-484
echo - Frontend: http://localhost:3000
echo.
echo Test Accounts:
echo - Use any email to sign up with Clerk
echo - Dashboard: http://localhost:3000/dashboard
echo - Pro Dashboard: http://localhost:3000/dashboard-pro
echo.
echo API Endpoints:
echo - Signals: http://localhost:3000/api/signals
echo - AOIs: http://localhost:3000/api/aois
echo - Instruments: http://localhost:3000/api/instruments
echo.
echo Press any key to stop all services...
pause >nul

echo Stopping services...
taskkill /F /IM node.exe >nul 2>&1
echo All services stopped.
pause
