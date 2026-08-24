@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion
cd /d "%~dp0"
title Система проверки знаний - Охрана труда и ТБ
color 0b
cls

echo ===============================================================================
echo        СИСТЕМА ПРОВЕРКИ ЗНАНИЙ ПО ОХРАНЕ ТРУДА И БЕЗОПАСНОСТИ
echo ===============================================================================
echo.

:: 1. Поиск Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "PATH=C:\Program Files\nodejs;%PATH%"
    ) else if exist "C:\Program Files (x86)\nodejs\node.exe" (
        set "PATH=C:\Program Files (x86)\nodejs;%PATH%"
    ) else if exist "%LOCALAPPDATA%\Programs\node\node.exe" (
        set "PATH=%LOCALAPPDATA%\Programs\node;%PATH%"
    ) else (
        color 0c
        echo [ОШИБКА] На вашем компьютере не найдена среда Node.js!
        echo.
        echo Для запуска приложения требуется бесплатный Node.js (версия LTS):
        echo https://nodejs.org/
        echo.
        echo Нажмите любую клавишу, чтобы открыть страницу скачивания...
        pause > nul
        start https://nodejs.org/
        goto :END
    )
)

:: 2. Проверка зависимостей
if not exist "node_modules\express" (
    echo [1/3] Установка необходимых модулей (один раз, займет ~20 сек)...
    call npm install --no-audit --no-fund
    if %errorlevel% neq 0 (
        color 0c
        echo [ОШИБКА] Не удалось установить модули.
        goto :ERROR_EXIT
    )
)

:: 3. Проверка сборки
if not exist "dist\server.cjs" (
    echo [2/3] Первоначальная сборка проекта...
    call npm run build
    if %errorlevel% neq 0 (
        color 0c
        echo [ОШИБКА] Сбой при сборке проекта.
        goto :ERROR_EXIT
    )
)

:: 4. Запуск сервера в фоне
echo [3/3] Запуск программы...
echo.
start "SafetyTestPro-Backend" /min node dist/server.cjs

:: 5. Открытие приложения
timeout /t 2 > nul
if exist "node_modules\electron" (
    echo Открытие в окне программы...
    call npx electron .
) else (
    echo Открытие в браузере...
    start "" http://localhost:3000
)

echo.
echo Приложение работает. Для завершения просто закройте окно программы.
goto :END

:ERROR_EXIT
echo.
echo Произошла ошибка при запуске.
pause

:END
