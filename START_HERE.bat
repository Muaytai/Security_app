@echo off
title Safety Test Pro - Launcher
color 0b
cls

echo ====================================================================
echo    ZAPUSK SISTEMY PROVERKI ZNANIY PO OKHRANE TRUDA I TB
echo ====================================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0c
    echo [OSHIBKA] Node.js ne ustanovlen!
    echo Skachayte i ustanovite Node.js (LTS) s: https://nodejs.org/
    echo Posle ustanovki zapustite etot fayl snova.
    echo.
    pause
    start https://nodejs.org/
    exit /b 1
)

if not exist "node_modules" (
    echo [1/2] Ustanovka neobkhodimykh moduley...
    call npm install --no-audit --no-fund
)

echo [2/2] Zapusk prilozheniya...
start "" http://localhost:3000
npm run dev

pause
