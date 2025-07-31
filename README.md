# Sprint Planning Demo Application

A full-stack demo application featuring React.js frontend, FastAPI backend, and PostgreSQL database with simulated authentication and sprint planning functionality.

## Features

- **Demo Authentication**: Simulated Google OAuth login flow
- **Sprint Planning**: Interactive chat-based sprint planning with LLM integration
- **Grok API Integration**: Summary generation using Grok API
- **Modern UI**: Clean, responsive design with dropdown navigation

## Tech Stack

- **Frontend**: React.js with modern hooks and context
- **Backend**: FastAPI with async support
- **Database**: PostgreSQL
- **Authentication**: Demo-only (simulated Google OAuth)
- **LLM Integration**: Mock/Stub implementation
- **Grok API**: Mock endpoint for summarization

## Project Structure

```
Sharuk_Proj/
├── frontend/          # React.js application
├── backend/           # FastAPI application
├── database/          # Database setup and migrations
└── README.md         # This file
```

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- Python (v3.8 or higher)
- PostgreSQL
- Git

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

5. Run database migrations:
   ```bash
   python manage.py migrate
   ```

6. Start the backend server:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Demo Flow

1. **Landing Page**: Click "Login with Google" to simulate authentication
2. **Home Page**: Select "sprint" from the dropdown menu
3. **Sprint Planning**: Click "Start Planning" to begin the interactive chat
4. **Chat Interface**: Answer dynamic questions from the LLM
5. **Summary**: View the Grok-generated sprint plan summary

## API Endpoints

### Authentication (Demo)
- `POST /api/auth/login` - Simulate Google OAuth login
- `POST /api/auth/logout` - Simulate logout

### Sprint Planning
- `POST /api/sprint/start` - Start a new sprint planning session
- `POST /api/sprint/chat` - Send message to LLM and get response
- `POST /api/sprint/finish` - Complete planning and get Grok summary

### Mock Endpoints
- `POST /api/llm/chat` - Mock LLM chat endpoint
- `POST /api/grok/summarize` - Mock Grok summarization endpoint

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://username:password@localhost:5432/sprint_demo
SECRET_KEY=your-secret-key-here
CORS_ORIGINS=http://localhost:3000
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:8000
REACT_APP_LLM_ENDPOINT=http://localhost:8000/api/llm/chat
REACT_APP_GROK_ENDPOINT=http://localhost:8000/api/grok/summarize
```

## Development Notes

- **Authentication**: Currently simulated - no real OAuth implementation
- **LLM Integration**: Mock responses for demo purposes
- **Grok API**: Stubbed endpoint returning sample summaries
- **Database**: PostgreSQL with basic user and session tables

## Future Enhancements

- Real Google OAuth integration
- Secure credential storage with hashing
- Expanded feature dropdowns (rpx, etc.)
- Real LLM API integration
- Actual Grok API integration
- User management and persistence
- Advanced sprint planning features

## Troubleshooting

### Common Issues

1. **Database Connection**: Ensure PostgreSQL is running and credentials are correct
2. **CORS Errors**: Check that frontend URL is in CORS_ORIGINS
3. **Port Conflicts**: Change ports in package.json (frontend) or main.py (backend)

### Logs

- Backend logs: Check terminal where uvicorn is running
- Frontend logs: Check browser console and terminal where npm start is running

## Contributing

This is a demo application. For production use, implement proper security measures, real OAuth flows, and actual API integrations. 