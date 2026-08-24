@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion
cd /d "%~dp0"
title Сборка Windows EXE - SafetyTestPro (Охрана труда)
color 0a
cls

echo ===============================================================================
echo        МАСТЕР СБОРКИ WINDOWS ПРИЛОЖЕНИЯ (.EXE) - SafetyTestPro
echo ===============================================================================
echo.

:: 1. Поиск Node.js в системе и в стандартных папках установки
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
        echo Для сборки EXE файла установите бесплатный Node.js (версия LTS):
        echo 1. Скачайте установщик с сайта https://nodejs.org/
        echo 2. Установите, нажимая Next -> Next -> Install.
        echo 3. После установки перезапустите Total Commander и снова нажмите этот файл.
        echo.
        echo Нажмите любую клавишу, чтобы открыть страницу скачивания Node.js...
        pause > nul
        start https://nodejs.org/
        goto :END
    )
)

echo [OK] Node.js обнаружен: 
node -v
npm -v
echo.

:: 2. Проверка и установка библиотек
echo [1/3] Проверка библиотек (npm install)...
if not exist "node_modules\express" (
    echo Установка модулей... Пожалуйста, подождите 20-30 сек...
    call npm install --no-audit --no-fund
    if %errorlevel% neq 0 (
        color 0c
        echo [ОШИБКА] Не удалось установить пакеты npm. Проверьте интернет-соединение.
        goto :ERROR_EXIT
    )
) else (
    echo Библиотеки уже установлены.
)

:: 3. Сборка интерфейса и сервера
echo.
echo [2/3] Компиляция приложения и базы вопросов (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    color 0c
    echo [ОШИБКА] Ошибка при компиляции проекта.
    goto :ERROR_EXIT
)

:: 4. Упаковка в EXE
echo.
echo [3/3] Упаковка в автономный исполняемый файл .EXE (electron-builder)...
echo Это займет от 30 секунд до 2 минут при первой сборке...
call npx electron-builder --win --x64
if %errorlevel% neq 0 (
    echo.
    echo Попытка сборки в portable-режиме...
    call npx electron-builder --win portable --x64
    if %errorlevel% neq 0 (
        color 0c
        echo [ОШИБКА] Сбой при создании .exe файла.
        goto :ERROR_EXIT
    )
)

echo.
echo ===============================================================================
echo [УСПЕХ!] Сборка успешно завершена!
echo.
echo Готовые файлы находятся в папке:
echo  - Папка: dist-electron\win-unpacked\SafetyTestPro.exe (распакованная версия)
echo  - Установщик / Автономный EXE: dist-electron\
echo ===============================================================================
echo.
pause
explorer "%~dp0dist-electron"
goto :END

:ERROR_EXIT
echo.
echo -------------------------------------------------------------------------------
echo Сборка прервана из-за ошибки выше. Окно оставлено открытым для диагностики.
echo -------------------------------------------------------------------------------
echo.
pause

:END
