@echo off
cd /d "%~dp0"

echo ===== Fitness site =====
echo.

rem Check that npm is available
where npm >nul 2>nul
if errorlevel 1 (
  echo "npm" is not available on this system.
  echo Please install Node.js from https://nodejs.org, then reopen this file.
  echo.
  pause
  exit /b
)

if not exist node_modules (
  echo First run detected - installing dependencies...
  npm install
  echo.
)

echo Starting development server...
echo (Leave this window open while you use the site.)
echo.

start "" http://localhost:5173
npm run dev

echo.
echo Dev server has stopped or failed.
pause
