#!/bin/bash

# Sprint Planning Demo - Startup Script
# This script helps you start both the backend and frontend servers

echo "🚀 Starting Sprint Planning Demo Application..."
echo "================================================"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16 or higher."
    exit 1
fi

# Check if PostgreSQL is running (optional check)
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL client not found. Make sure PostgreSQL is installed and running."
fi

echo "📋 Prerequisites check completed."

# Function to start backend
start_backend() {
    echo "🔧 Starting FastAPI backend..."
    cd backend
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        echo "📦 Creating virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install dependencies
    echo "📦 Installing Python dependencies..."
    pip install -r requirements.txt
    
    # Check if .env file exists
    if [ ! -f ".env" ]; then
        echo "📝 Creating .env file from template..."
        cp env.example .env
        echo "⚠️  Please edit backend/.env with your database credentials"
    fi
    
    # Start backend server
    echo "🚀 Starting backend server on http://localhost:8000"
    uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
    BACKEND_PID=$!
    cd ..
}

# Function to start frontend
start_frontend() {
    echo "🔧 Starting React frontend..."
    cd frontend
    
    # Install dependencies
    echo "📦 Installing Node.js dependencies..."
    npm install
    
    # Start frontend server
    echo "🚀 Starting frontend server on http://localhost:3000"
    npm start &
    FRONTEND_PID=$!
    cd ..
}

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start servers
start_backend
sleep 3
start_frontend

echo ""
echo "✅ Application started successfully!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Documentation: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for user to stop
wait 