@echo off
title Safety Test Pro
color 0b
cls

echo Zapusk sistemy proverki znaniy...

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [OSHIBKA] Ustanovite Node.js s https://nodejs.org/
    pause
    start https://nodejs.org/
    exit /b 1
)

if not exist node_modules (
    echo Ustanovka bibliotek...
    call npm install --no-audit --no-fund
)

start "" http://localhost:3000
npm run dev

pause
