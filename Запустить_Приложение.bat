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
    echo Для запуска приложения требуется бесплатный компонент Node.js (LTS).
    echo 1. Перейдите на сайт: https://nodejs.org/
    echo 2. Скачайте и установите версию "LTS" (нажимая Next -> Next -> Install).
    echo 3. После установки снова запустите этот файл.
    echo.
    echo Нажмите любую клавишу, чтобы открыть страницу загрузки...
    pause > nul
    start https://nodejs.org/
    exit /b 1
)

:: 2. Проверка библиотек
if not exist "node_modules" (
    echo [1/3] Первоначальная установка библиотек (займет ~30 сек)...
    call npm install --no-audit --no-fund
    if %errorlevel% neq 0 (
        color 0c
        echo [ОШИБКА] Не удалось установить модули. Проверьте интернет-соединение.
        pause
        exit /b 1
    )
)

:: 3. Проверка установленного Electron
if not exist "node_modules\electron" (
    echo [2/3] Подготовка оконного режима Electron...
    call npm install --save-dev electron concurrently wait-on
)

:: 4. Запуск приложения в отдельном окне
echo [3/3] Запуск программы в отдельном окне...
echo.
echo Программа запускается. Чтобы закрыть приложение, закройте окно программы.
echo -------------------------------------------------------------------------------
echo.

call npx concurrently -k -s first "npm run dev" "npx wait-on http://localhost:3000 && npx electron ."

if %errorlevel% neq 0 (
    echo.
    echo Запуск через браузер...
    start "" http://localhost:3000
    npm run dev
)

pause
