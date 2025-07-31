# Quick Start Guide

Get the Sprint Planning Demo running in minutes!

## Prerequisites

- **Python 3.8+** - [Download here](https://www.python.org/downloads/)
- **Node.js 16+** - [Download here](https://nodejs.org/)
- **PostgreSQL** - [Download here](https://www.postgresql.org/download/)

## Quick Setup (5 minutes)

### 1. Database Setup
```bash
# Start PostgreSQL service
# On Windows: Start PostgreSQL service from Services
# On Mac: brew services start postgresql
# On Linux: sudo systemctl start postgresql

# Create database
psql -U postgres
CREATE DATABASE sprint_demo;
\q

# Run setup script
psql -U postgres -d sprint_demo -f database/setup.sql
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp env.example .env
# Edit .env with your database credentials

# Start backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup
```bash
# In a new terminal
cd frontend

# Install dependencies
npm install

# Start frontend
npm start
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## Demo Flow

1. **Landing Page**: Click "Login with Google (Demo)"
2. **Home Page**: Select "Sprint Planning" from dropdown
3. **Start Planning**: Click "Start Planning" button
4. **Chat Interface**: Answer AI questions about your sprint
5. **Summary**: View the generated sprint plan

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check credentials in `backend/.env`
- Verify database exists: `psql -U postgres -d sprint_demo`

### Port Conflicts
- Backend: Change port in `uvicorn` command
- Frontend: Change port in `package.json` scripts

### CORS Issues
- Ensure frontend URL is in `CORS_ORIGINS` in backend `.env`

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://username:password@localhost:5432/sprint_demo
SECRET_KEY=your-secret-key-here
CORS_ORIGINS=http://localhost:3000
```

## Features Demonstrated

- ✅ Simulated Google OAuth login
- ✅ Interactive chat-based sprint planning
- ✅ Dynamic question generation
- ✅ Context-aware responses
- ✅ Grok API integration (mock)
- ✅ Sprint plan summarization
- ✅ Modern, responsive UI

## Next Steps

- Implement real Google OAuth
- Add real LLM API integration
- Add real Grok API integration
- Expand feature dropdowns
- Add user management
- Add data persistence

## Support

If you encounter issues:
1. Check the console logs
2. Verify all prerequisites are installed
3. Ensure database is properly configured
4. Check network connectivity between frontend and backend 