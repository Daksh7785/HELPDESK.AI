# HELPDESK.AI Workspace Setup Script
# Use this script to ensure all dependencies and configurations are correct for the project.

Write-Host "🚀 Starting HELPDESK.AI Workspace Setup..." -ForegroundColor Cyan

# 1. Check Node.js
If (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node -v
    Write-Host "✅ Node.js is installed ($nodeVersion)" -ForegroundColor Green
} Else {
    Write-Host "❌ Node.js is NOT installed. Please install it from https://nodejs.org/" -ForegroundColor Red
    Exit
}

# 2. Check Python
If (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonVersion = python --version
    Write-Host "✅ Python is installed ($pythonVersion)" -ForegroundColor Green
} Else {
    Write-Host "❌ Python is NOT installed. Please install it from https://www.python.org/" -ForegroundColor Red
    Exit
}

# 3. Initialize Frontend
Write-Host "`n📦 Setting up Frontend..." -ForegroundColor Yellow
cd Frontend
npm install
If ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend dependencies installed successfully." -ForegroundColor Green
} Else {
    Write-Host "❌ Failed to install Frontend dependencies." -ForegroundColor Red
}
cd ..

# 4. Initialize Backend
Write-Host "`n⚙️ Setting up Backend..." -ForegroundColor Yellow
cd backend
python -m venv venv
Write-Host "✅ Virtual environment created." -ForegroundColor Green
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
If ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend dependencies installed successfully." -ForegroundColor Green
} Else {
    Write-Host "❌ Failed to install Backend dependencies." -ForegroundColor Red
}
cd ..

# 5. Check Environment Variables
Write-Host "`n🔑 Checking Environment Variables..." -ForegroundColor Yellow
If (Test-Path "Frontend\.env") {
    Write-Host "✅ Frontend .env found." -ForegroundColor Green
} Else {
    Write-Host "⚠️ Frontend .env missing. Please create it using .env.example (if available)." -ForegroundColor Magenta
}

Write-Host "`n✨ Workspace setup complete! You are ready to develop." -ForegroundColor Cyan
Write-Host "To start the frontend: cd Frontend; npm run dev"
Write-Host "To start the backend: cd backend; .\venv\Scripts\activate; uvicorn main:app --reload"
