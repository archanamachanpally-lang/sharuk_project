@echo off
REM Sprint Planning Demo - Startup Script for Windows
REM This script helps you start both the backend and frontend servers

echo 🚀 Starting Sprint Planning Demo Application...
echo ================================================

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.8 or higher.
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 16 or higher.
    pause
    exit /b 1
)

echo 📋 Prerequisites check completed.

REM Start backend
echo 🔧 Starting FastAPI backend...
cd backend

REM Check if virtual environment exists
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo 📦 Installing Python dependencies...
pip install -r requirements.txt

REM Check if .env file exists
if not exist ".env" (
    echo 📝 Creating .env file from template...
    copy env.example .env
    echo ⚠️  Please edit backend\.env with your database credentials
)

REM Start backend server
echo 🚀 Starting backend server on http://localhost:8000
start "Backend Server" cmd /k "uvicorn main:app --reload --host 0.0.0.0 --port 8000"

cd ..

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend
echo 🔧 Starting React frontend...
cd frontend

REM Install dependencies
echo 📦 Installing Node.js dependencies...
npm install

REM Start frontend server
echo 🚀 Starting frontend server on http://localhost:3000
start "Frontend Server" cmd /k "npm start"

cd ..

echo.
echo ✅ Application started successfully!
echo 🌐 Frontend: http://localhost:3000
echo 🔧 Backend API: http://localhost:8000
echo 📚 API Documentation: http://localhost:8000/docs
echo.
echo Close the command windows to stop the servers
pause 