@echo off
setlocal
cd /d "%~dp0"
title SafetyTestPro Builder

echo ===============================================================================
echo            BUILD WINDOWS APP (.EXE) - SafetyTestPro
echo ===============================================================================
echo.

:: 1. Add Node.js to PATH if needed
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
    echo [ERROR] Node.js is not found on your PC!
    echo Please install Node.js (LTS) from https://nodejs.org/
    echo.
    pause
    start https://nodejs.org/
    exit /b 1
)

echo [OK] Node.js version:
node -v
npm -v
echo.

:: 2. Install dependencies
echo [Step 1/3] Checking dependencies (npm install)...
call npm install --no-audit --no-fund
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed. Please check internet connection.
    pause
    exit /b 1
)

:: 3. Build application
echo.
echo [Step 2/3] Building application (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] npm run build failed.
    pause
    exit /b 1
)

:: 4. Package to EXE
echo.
echo [Step 3/3] Packaging into Windows EXE (electron-builder)...
call npx electron-builder --win --x64
if %errorlevel% neq 0 (
    echo.
    echo Trying portable build target...
    call npx electron-builder --win portable --x64
)

echo.
echo ===============================================================================
echo [SUCCESS] Build completed!
echo.
echo Your executable files are in:
echo   dist-electron\
echo ===============================================================================
echo.

if exist "dist-electron" (
    explorer "dist-electron"
)

pause
