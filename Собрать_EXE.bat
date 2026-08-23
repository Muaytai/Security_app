@echo off
title Sistema TB - Sborca EXE
color 0a
cls

echo ====================================================================
echo   SBORKA WINDOWS PRILOZHENIYA (.EXE)
echo   Sistema proverki znaniy po tekhnike bezopasnosti
echo ====================================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0c
    echo [OSHIBKA] Node.js ne nayden na kompyutere.
    echo Ustanovite Node.js s sayta https://nodejs.org/
    echo.
    pause
    start https://nodejs.org/
    exit /b 1
)

echo [1/4] Ustanovka paketov...
call npm install --no-audit --no-fund

echo.
echo [2/4] Kompilyatsiya proekta...
call npm run build

echo.
echo [3/4] Ustanovka Electron builder...
call npm install --save-dev electron electron-builder

echo.
echo [4/4] Sozdanie avtonomnogo EXE fayla...
call npx electron-builder --win portable

echo.
echo ====================================================================
echo GOTOVO. EXE fayl sozdan v papke dist-electron ili dist
echo ====================================================================
echo.
pause
