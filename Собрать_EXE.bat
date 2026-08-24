@echo off
title SafetyTestPro Builder
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build.ps1"
if %errorlevel% neq 0 (
    echo.
    echo If PowerShell was blocked, trying direct commands:
    call npm install --no-audit --no-fund
    call npm run build
    call npx electron-builder --win --x64
    pause
)
