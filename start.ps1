# PowerShell Start Script for SafetyTestPro
$Host.UI.RawUI.WindowTitle = "SafetyTestPro - Запуск"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Clear-Host

Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "        СИСТЕМА ПРОВЕРКИ ЗНАНИЙ ПО ОХРАНЕ ТРУДА И БЕЗОПАСНОСТИ" -ForegroundColor Cyan
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
    Write-Host "Для запуска требуется Node.js: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Нажмите Enter для выхода"
    Start-Process "https://nodejs.org/"
    exit 1
}

# 2. Установка модулей при необходимости
if (-not (Test-Path "node_modules\express")) {
    Write-Host "[1/3] Установка необходимых модулей (~20 сек)..." -ForegroundColor Yellow
    npm install --no-audit --no-fund
}

# 3. Сборка если нет dist
if (-not (Test-Path "dist\server.cjs")) {
    Write-Host "[2/3] Первоначальная подготовка интерфейса..." -ForegroundColor Yellow
    npm run build
}

# 4. Запуск сервера в фоне
Write-Host "[3/3] Запуск программы..." -ForegroundColor Green
$serverProcess = Start-Process -FilePath "node" -ArgumentList "dist/server.cjs" -WindowStyle Hidden -PassThru

Start-Sleep -Seconds 2

# 5. Запуск оконного режима или открытие браузера
if (Test-Path "node_modules\electron") {
    Write-Host "Открытие окна программы..." -ForegroundColor Green
    npx electron .
} else {
    Write-Host "Открытие в браузере..." -ForegroundColor Green
    Start-Process "http://localhost:3000"
}

# Остановка фонового сервера при закрытии
if ($serverProcess -and -not $serverProcess.HasExited) {
    Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
}
