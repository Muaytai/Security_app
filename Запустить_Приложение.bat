@echo off
title SafetyTestPro - Запуск
if exist "C:\Program Files\nodejs\node.exe" set "PATH=C:\Program Files\nodejs;%PATH%"
if exist "C:\Program Files (x86)\nodejs\node.exe" set "PATH=C:\Program Files (x86)\nodejs;%PATH%"
if exist "%LOCALAPPDATA%\Programs\node\node.exe" set "PATH=%LOCALAPPDATA%\Programs\node;%PATH%"

node -v >nul 2>nul
if errorlevel 1 goto NO_NODE

if not exist "node_modules\express" (
    echo Установка модулей...
    call npm install --no-audit --no-fund
)

if not exist "dist\server.cjs" (
    echo Сборка приложения...
    call npm run build
)

echo Запуск сервера...
start "SafetyTestPro-Backend" /min node dist/server.cjs

timeout /t 2 > nul

if exist "node_modules\electron" (
    call npx electron .
) else (
    start "" http://localhost:3000
)
goto END

:NO_NODE
echo [ОШИБКА] Node.js не найден!
echo Скачайте: https://nodejs.org/
pause
start https://nodejs.org/

:END
