# Movie Recommendation Platform - Firebase Edition Startup Script

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Movie Recommendation Platform        " -ForegroundColor Cyan
Write-Host "      (Firebase Serverless Edition)     " -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
$FRONTEND = Join-Path $ROOT "frontend"

Write-Host "Starting Frontend (React / Vite + Firebase)..." -ForegroundColor Yellow

Start-Process powershell -ArgumentList "-NoExit", "-Command", "
    cd '$FRONTEND';
    Write-Host 'Starting Vite dev server...' -ForegroundColor Green;
    cmd.exe /c 'npm run dev'
"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Frontend Server Starting!              " -ForegroundColor Green
Write-Host "----------------------------------------" -ForegroundColor Green
Write-Host " App URL   ->  http://localhost:5173" -ForegroundColor White
Write-Host " Database  ->  Google Cloud Firestore" -ForegroundColor White
Write-Host " Auth      ->  Firebase Authentication" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
