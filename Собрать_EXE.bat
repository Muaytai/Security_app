@echo off
chcp 65001 >nul
title Система проверки знаний по ТБ (Сборка Windows .EXE)
color 0A

echo =================================================================
echo   СБОРКА АВТОНОМНОГО WINDOWS ИСПОЛНЯЕМОГО ФАЙЛА (.EXE)
echo   Система проверки знаний по технике безопасности и охране труда
echo =================================================================
echo.

:: Проверка наличия Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ОШИБКА] Node.js не найден на этом компьютере!
    echo Скачайте и установите Node.js с официального сайта: https://nodejs.org/ (версия LTS).
    echo После установки перезапустите этот скрипт.
    echo.
    pause
    exit /b 1
)

echo [1/4] Проверка и установка зависимостей...
call npm install
if %errorlevel% neq 0 (
    color 0C
    echo [ОШИБКА] Не удалось установить зависимости npm.
    pause
    exit /b 1
)

echo.
echo [2/4] Компиляция клиентской части и локального сервера базы данных...
call npm run build
if %errorlevel% neq 0 (
    color 0C
    echo [ОШИБКА] Сборка проекта завершилась с ошибкой.
    pause
    exit /b 1
)

echo.
echo [3/4] Установка инструментов сборщика Electron (.EXE)...
call npm install --save-dev electron electron-builder
if %errorlevel% neq 0 (
    color 0C
    echo [ОШИБКА] Не удалось установить electron-builder.
    pause
    exit /b 1
)

echo.
echo [4/4] Генерация автономного .exe файла для Windows...
npx electron-builder --win --x64 -c.win.target=portable
if %errorlevel% neq 0 (
    echo Повторная попытка стандартной сборки...
    npx electron-builder --win
)

echo.
echo =================================================================
echo [УСПЕХ!] Сборка успешно завершена!
echo Готовый исполняемый файл находится в папке: dist\
echo =================================================================
echo.
pause
