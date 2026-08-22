@echo off
chcp 65001 > nul
title Установка и настройка системы «Экзамен» (Windows Setup)
color 0A

echo ===============================================================================
echo     СИСТЕМА ПРОВЕРКИ ЗНАНИЙ И АТТЕСТАЦИИ «ЭКЗАМЕН» - УСТАНОВКА ДЛЯ WINDOWS
echo ===============================================================================
echo.

:: 1. Проверка наличия Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Node.js не обнаружен на вашем компьютере.
    echo [*] Для работы автономного сервера требуется среда Node.js (LTS).
    echo [*] Открываем официальный сайт для быстрой загрузки (установка занимает 1 минуту)...
    start https://nodejs.org/en/download/
    echo.
    echo После установки Node.js перезапустите этот файл Setup_Windows.bat.
    pause
    exit /b 1
)

echo [OK] Среда Node.js обнаружена:
node -v
npm -v
echo.

:: 2. Установка зависимостей
echo [*] Шаг 1/3: Установка компонентов и модулей базы данных...
call npm install
if %errorlevel% neq 0 (
    echo [ОШИБКА] Не удалось установить модули npm.
    pause
    exit /b 1
)
echo [OK] Модули успешно установлены.
echo.

:: 3. Сборка приложения
echo [*] Шаг 2/3: Компиляция локального автономного сервера и интерфейса...
call npm run build
if %errorlevel% neq 0 (
    echo [ОШИБКА] Сборка завершилась с ошибкой.
    pause
    exit /b 1
)
echo [OK] Приложение успешно скомпилировано в папку dist/.
echo.

:: 4. Создание ярлыка на Рабочем столе
echo [*] Шаг 3/3: Создание ярлыка на Рабочем столе...
set SCRIPT_DIR=%~dp0
set SCRIPT_DIR=%SCRIPT_DIR:~0,-1%

powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\Экзамен - Охрана труда.lnk'); $Shortcut.TargetPath = '%SCRIPT_DIR%\Запустить_Экзамен.bat'; $Shortcut.WorkingDirectory = '%SCRIPT_DIR%'; $Shortcut.Description = 'Система проверки знаний и аттестации Экзамен'; $Shortcut.Save()"

echo [OK] Ярлык «Экзамен - Охрана труда» создан на вашем Рабочем столе!
echo.

echo ===============================================================================
echo                      УСТАНОВКА УСПЕШНО ЗАВЕРШЕНА!
echo ===============================================================================
echo.
echo Программа готова к работе в автономном режиме и по локальной сети.
echo Запускаем систему...
echo.

timeout /t 2 > nul
start "" "%SCRIPT_DIR%\Запустить_Экзамен.bat"
