# PowerShell Build Script for SafetyTestPro
$Host.UI.RawUI.WindowTitle = "Сборка SafetyTestPro EXE"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Clear-Host

Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "        МАСТЕР СБОРКИ WINDOWS ПРИЛОЖЕНИЯ (.EXE) - SafetyTestPro" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Поиск Node.js
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    $possiblePaths = @(
        "C:\Program Files\nodejs",
        "C:\Program Files (x86)\nodejs",
        "$env:LOCALAPPDATA\Programs\node"
    )
    foreach ($p in $possiblePaths) {
        if (Test-Path "$p\node.exe") {
            $env:Path = "$p;" + $env:Path
            break
        }
    }
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
}

if (-not $nodeCmd) {
    Write-Host "[ОШИБКА] Среда Node.js не найдена на вашем компьютере!" -ForegroundColor Red
    Write-Host "Для сборки требуется бесплатная программа Node.js (LTS)." -ForegroundColor Yellow
    Write-Host "Скачайте и установите: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Нажмите Enter, чтобы открыть страницу скачивания Node.js"
    Start-Process "https://nodejs.org/"
    exit 1
}

Write-Host "[OK] Node.js найден: $(node -v)" -ForegroundColor Green
Write-Host "[OK] NPM найден: $(npm -v)" -ForegroundColor Green
Write-Host ""

# 2. Установка зависимостей
Write-Host "[1/3] Проверка библиотек проекта (npm install)..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules\express")) {
    Write-Host "Идет установка библиотек, пожалуйста подождите 20-30 секунд..." -ForegroundColor Gray
    npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ОШИБКА] Не удалось установить модули npm. Проверьте интернет." -ForegroundColor Red
        Read-Host "Нажмите Enter для выхода"
        exit 1
    }
} else {
    Write-Host "Библиотеки уже установлены." -ForegroundColor Green
}

# 3. Сборка React и сервера
Write-Host ""
Write-Host "[2/3] Компиляция приложения и базы вопросов (npm run build)..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ОШИБКА] Сбой при компиляции проекта." -ForegroundColor Red
    Read-Host "Нажмите Enter для выхода"
    exit 1
}
Write-Host "Компиляция успешно завершена." -ForegroundColor Green

# 4. Сборка EXE через electron-builder
Write-Host ""
Write-Host "[3/3] Упаковка в автономный исполняемый файл .EXE..." -ForegroundColor Yellow
Write-Host "Это займет от 30 секунд до 2 минут при первой сборке..." -ForegroundColor Gray
npx electron-builder --win --x64
if ($LASTEXITCODE -ne 0) {
    Write-Host "Попытка сборки в portable-режиме..." -ForegroundColor Gray
    npx electron-builder --win portable --x64
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ОШИБКА] Не удалось упаковать EXE файл." -ForegroundColor Red
        Read-Host "Нажмите Enter для выхода"
        exit 1
    }
}

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Green
Write-Host "[УСПЕХ!] Сборка успешно завершена!" -ForegroundColor Green
Write-Host ""
Write-Host "Готовый файл приложения находится в папке:" -ForegroundColor White
Write-Host " -> dist-electron\win-unpacked\SafetyTestPro.exe" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Green
Write-Host ""

$distPath = Join-Path $PSScriptRoot "dist-electron"
if (Test-Path $distPath) {
    Start-Process explorer.exe $distPath
}

Read-Host "Нажмите Enter, чтобы закрыть это окно"
