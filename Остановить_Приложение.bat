@echo off
chcp 65001 > nul
setlocal
title Остановка приложения
color 0c
cls

echo ===============================================================================
echo                ОСТАНОВКА ПРОЦЕССОВ ПРИЛОЖЕНИЯ
echo ===============================================================================
echo.

echo [*] Завершение процессов на порту 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a > nul 2>&1
)

echo [*] Завершение процессов electron...
taskkill /F /IM electron.exe > nul 2>&1

echo.
echo [OK] Приложение и все фоновые службы успешно остановлены.
echo.
timeout /t 2 > nul
