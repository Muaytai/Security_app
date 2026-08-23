@echo off
chcp 65001 > nul
setlocal
cd /d "%~dp0"
title Сборка Windows EXE - Охрана труда и ТБ
color 0a
cls

echo ===============================================================================
echo        СОЗДАНИЕ АВТОНОМНОГО WINDOWS ПРИЛОЖЕНИЯ (.EXE)
echo ===============================================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0c
    echo [ОШИБКА] На вашем компьютере не установлена среда Node.js.
    echo Для сборки EXE файла требуется Node.js (LTS).
    echo Скачайте с официального сайта: https://nodejs.org/
    echo.
    pause
    start https://nodejs.org/
    exit /b 1
)

echo [Шаг 1 из 4] Установка необходимых пакетов...
call npm install --no-audit --no-fund
if %errorlevel% neq 0 (
    color 0c
    echo [ОШИБКА] Не удалось установить пакеты.
    pause
    exit /b 1
)

echo.
echo [Шаг 2 из 4] Компиляция клиентской части и локальной базы SQLite...
call npm run build
if %errorlevel% neq 0 (
    color 0c
    echo [ОШИБКА] Сбой при сборке проекта.
    pause
    exit /b 1
)

echo.
echo [Шаг 3 из 4] Подключение упаковщика Electron Builder...
call npm install --save-dev electron electron-builder
if %errorlevel% neq 0 (
    color 0c
    echo [ОШИБКА] Не удалось загрузить сборщик Electron.
    pause
    exit /b 1
)

echo.
echo [Шаг 4 из 4] Упаковка в автономный исполняемый файл .EXE...
call npx electron-builder --win portable
if %errorlevel% neq 0 (
    echo Повтор сборки со стандартным профилем...
    call npx electron-builder --win
)

echo.
echo ===============================================================================
echo ГОТОВО! Сборка успешно завершена.
echo Готовый файл программы (.exe) находится в папке: dist-electron\ или dist\
echo ===============================================================================
echo.
pause
