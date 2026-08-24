@echo off
title SafetyTestPro - Сборка EXE
echo ===================================================
echo [1] Проверка Node.js...
echo ===================================================

if exist "C:\Program Files\nodejs\node.exe" set "PATH=C:\Program Files\nodejs;%PATH%"
if exist "C:\Program Files (x86)\nodejs\node.exe" set "PATH=C:\Program Files (x86)\nodejs;%PATH%"
if exist "%LOCALAPPDATA%\Programs\node\node.exe" set "PATH=%LOCALAPPDATA%\Programs\node;%PATH%"

node -v >nul 2>nul
if errorlevel 1 goto NO_NODE

echo [OK] Node.js найден:
node -v
npm -v
echo.

echo ===================================================
echo [2] Установка пакетов (npm install)...
echo ===================================================
call npm install --no-audit --no-fund
if errorlevel 1 goto ERR_INSTALL

echo.
echo ===================================================
echo [3] Компиляция приложения (npm run build)...
echo ===================================================
call npm run build
if errorlevel 1 goto ERR_BUILD

echo.
echo ===================================================
echo [4] Создание EXE файла (electron-builder)...
echo ===================================================
call npx electron-builder --win --x64
if errorlevel 1 goto TRY_PORTABLE
goto SUCCESS

:TRY_PORTABLE
echo.
echo Попытка сборки в portable-режиме...
call npx electron-builder --win portable --x64
if errorlevel 1 goto ERR_EXE

:SUCCESS
echo.
echo ===================================================
echo [УСПЕХ] EXE файл успешно создан в папке dist-electron!
echo ===================================================
echo.
if exist "dist-electron" explorer "dist-electron"
goto END

:NO_NODE
echo.
echo [ОШИБКА] Node.js не найден на компьютере!
echo Установите Node.js LTS с сайта https://nodejs.org/
echo.
start https://nodejs.org/
goto END

:ERR_INSTALL
echo.
echo [ОШИБКА] Сбой при установке библиотек (npm install). Проверьте интернет.
goto END

:ERR_BUILD
echo.
echo [ОШИБКА] Сбой при сборке проекта (npm run build).
goto END

:ERR_EXE
echo.
echo [ОШИБКА] Сбой при создании EXE файла.
goto END

:END
echo.
echo Нажмите любую клавишу для выхода...
pause >nul
