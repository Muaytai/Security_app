@echo off
setlocal
cd /d "%~dp0"
title SafetyTestPro Launcher

echo ===============================================================================
echo            SafetyTestPro - Starting App
echo ===============================================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "PATH=C:\Program Files\nodejs;%PATH%"
    ) else if exist "C:\Program Files (x86)\nodejs\node.exe" (
        set "PATH=C:\Program Files (x86)\nodejs;%PATH%"
    ) else if exist "%LOCALAPPDATA%\Programs\node\node.exe" (
        set "PATH=%LOCALAPPDATA%\Programs\node;%PATH%"
    )
)

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Download LTS version from: https://nodejs.org/
    pause
    start https://nodejs.org/
    exit /b 1
)

if not exist "node_modules\express" (
    echo Installing dependencies...
    call npm install --no-audit --no-fund
)

if not exist "dist\server.cjs" (
    echo Building app bundle...
    call npm run build
)

echo Starting backend...
start "SafetyTestPro-Backend" /min node dist/server.cjs

timeout /t 2 > nul

if exist "node_modules\electron" (
    echo Opening Electron Window...
    call npx electron .
) else (
    echo Opening in default browser...
    start "" http://localhost:3000
)
