@echo off
chcp 65001 >nul
title Система проверки знаний по ТБ
color 0B

echo =================================================================
echo   Запуск системы проверки знаний по технике безопасности
echo =================================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ОШИБКА] Node.js не установлен!
    echo Скачайте бесплатный Node.js: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

if not exist node_modules (
    echo [Первый запуск] Установка необходимых библиотек...
    call npm install
)

echo Запуск локального сервера тестирования...
start "" http://localhost:3000
npm run dev

pause
