@echo off
chcp 65001 > nul
setlocal
cd /d "%~dp0"
title Система проверки знаний - Охрана труда и ТБ
color 0b
cls

echo ===============================================================================
echo        СИСТЕМА ПРОВЕРКИ ЗНАНИЙ ПО ОХРАНЕ ТРУДА И БЕЗОПАСНОСТИ
echo ===============================================================================
echo.

:: 1. Проверка наличия Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0c
    echo [ОШИБКА] На вашем компьютере не установлена среда Node.js.
    echo.
    echo Для запуска требуется бесплатный компонент Node.js:
    echo https://nodejs.org/ (версия LTS)
    echo.
    pause
    start https://nodejs.org/
    exit /b 1
)

:: 2. Проверка зависимостей
if not exist "node_modules\express" (
    echo [1/3] Установка библиотек (займет 15-20 сек)...
    call npm install --ignore-scripts --no-audit --no-fund
)

:: 3. Проверка сборки проекта
if not exist "dist\server.cjs" (
    echo [2/3] Сборка интерфейса и базы данных...
    call npm run build
)

:: 4. Запуск автономного сервера в фоне
echo [3/3] Запуск программы...
echo.
start "SafetyTestPro-Server" /b node dist/server.cjs

:: 5. Открытие в окне Electron (если есть) или в Браузере
timeout /t 2 > nul
where npx >nul 2>nul
if exist "node_modules\electron" (
    call npx electron .
) else (
    start "" http://localhost:3000
)

echo.
echo Приложение закрыто.

