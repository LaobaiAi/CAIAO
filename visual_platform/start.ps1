# CAIAO Visual Platform - Start Script
# Starts both backend and frontend development servers

param(
    [int]$BackendPort = 8766,
    [int]$FrontendPort = 3000
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CAIAO Visual Platform" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── Start Backend ──────────────────────────────────────────
Write-Host "[1/2] Starting Backend (port $BackendPort)..." -ForegroundColor Yellow

$backendDir = Join-Path $root "backend"
$backendProcess = Start-Process python `
    -ArgumentList "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "$BackendPort", "--reload" `
    -WorkingDirectory $backendDir `
    -PassThru `
    -WindowStyle Normal

Write-Host "       Backend PID: $($backendProcess.Id)" -ForegroundColor Green

# Wait for backend to be ready
$maxWait = 15
for ($i = 0; $i -lt $maxWait; $i++) {
    Start-Sleep -Seconds 1
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:$BackendPort/api/health" -UseBasicParsing -TimeoutSec 2
        Write-Host "       Backend ready!" -ForegroundColor Green
        break
    } catch {
        if ($i -eq $maxWait - 1) {
            Write-Host "       Backend failed to start" -ForegroundColor Red
            exit 1
        }
    }
}

# ── Start Frontend ─────────────────────────────────────────
Write-Host "[2/2] Starting Frontend (port $FrontendPort)..." -ForegroundColor Yellow

$frontendDir = Join-Path $root "frontend"
$frontendProcess = Start-Process npm `
    -ArgumentList "run", "dev", "--", "--port", "$FrontendPort" `
    -WorkingDirectory $frontendDir `
    -PassThru `
    -WindowStyle Normal

Write-Host "       Frontend PID: $($frontendProcess.Id)" -ForegroundColor Green

# Wait for frontend to be ready
for ($i = 0; $i -lt $maxWait; $i++) {
    Start-Sleep -Seconds 1
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:$FrontendPort" -UseBasicParsing -TimeoutSec 2
        Write-Host "       Frontend ready!" -ForegroundColor Green
        break
    } catch {
        if ($i -eq $maxWait - 1) {
            Write-Host "       Frontend may still be starting..." -ForegroundColor DarkYellow
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Platform running!" -ForegroundColor Green
Write-Host "  Frontend : http://localhost:$FrontendPort" -ForegroundColor Cyan
Write-Host "  Backend  : http://localhost:$BackendPort" -ForegroundColor Cyan
Write-Host "  API Docs : http://localhost:$BackendPort/docs" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Gray

# Cleanup on exit
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
    Write-Host "`nStopping services..." -ForegroundColor Yellow
    Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
    Write-Host "Done." -ForegroundColor Green
}

# Keep script running
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
}
