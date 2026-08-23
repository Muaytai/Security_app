@echo off
title Safety Test Pro - Build Windows EXE
color 0b
cls

echo ====================================================================
echo        BUILDING WINDOWS STANDALONE APPLICATION (.EXE)
echo        Sistema proverki znaniy po TB i Okhrane Truda
echo ====================================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0c
    echo [ERROR] Node.js is not found on this computer.
    echo Please install Node.js (LTS) from https://nodejs.org/
    echo.
    pause
    start https://nodejs.org/
    exit /b 1
)

echo [Step 1 of 4] Installing dependencies...
call npm install --no-audit --no-fund
if %errorlevel% neq 0 (
    color 0c
    echo [ERROR] npm install failed. Check your internet connection.
    pause
    exit /b 1
)

echo.
echo [Step 2 of 4] Compiling application and SQLite backend...
call npm run build
if %errorlevel% neq 0 (
    color 0c
    echo [ERROR] Build compilation failed.
    pause
    exit /b 1
)

echo.
echo [Step 3 of 4] Installing Electron packager...
call npm install --save-dev electron electron-builder
if %errorlevel% neq 0 (
    color 0c
    echo [ERROR] Failed to install electron-builder.
    pause
    exit /b 1
)

echo.
echo [Step 4 of 4] Generating Standalone Windows .EXE...
call npx electron-builder --win portable --dir
call npx electron-builder --win portable

echo.
echo ====================================================================
echo SUCCESS: Portable EXE created successfully.
echo Look into folder: dist-electron\ or dist\
echo File: SafetyTestPro.exe
echo ====================================================================
echo.
pause
