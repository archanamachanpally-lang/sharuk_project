from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from typing import List, Optional
import os
from dotenv import load_dotenv

from database import get_db, engine
from models import Base
from schemas import (
    LoginRequest, LoginResponse, 
    SprintStartRequest, SprintStartResponse,
    ChatRequest, ChatResponse,
    SprintFinishRequest, SprintFinishResponse,
    LLMChatRequest, LLMChatResponse,
    GrokSummarizeRequest, GrokSummarizeResponse
)
from services import (
    auth_service, sprint_service, 
    llm_service, grok_service
)

# Load environment variables
load_dotenv()

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Sprint Planning Demo API",
    description="A demo API for sprint planning with LLM integration",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Sprint Planning Demo API", "status": "running"}

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "sprint-planning-api"}

# Authentication endpoints
@app.get("/api/auth/google/url")
async def get_google_auth_url():
    """Get Google OAuth URL"""
    return {"auth_url": auth_service.get_google_auth_url()}

from pydantic import BaseModel

class GoogleCallbackRequest(BaseModel):
    code: str

@app.post("/api/auth/google/callback")
async def google_auth_callback(request: GoogleCallbackRequest, db: Session = Depends(get_db)):
    """Handle Google OAuth callback"""
    return auth_service.authenticate_user(request.code, db)

@app.post("/api/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Simulate Google OAuth login (for demo)"""
    return auth_service.simulate_login(request)

@app.post("/api/auth/logout")
async def logout():
    """Simulate logout"""
    return auth_service.simulate_logout()

# Sprint planning endpoints
@app.post("/api/sprint/start", response_model=SprintStartResponse)
async def start_sprint_planning(
    request: SprintStartRequest,
    db: Session = Depends(get_db)
):
    """Start a new sprint planning session"""
    return sprint_service.start_sprint_planning(request, db)

@app.post("/api/sprint/chat", response_model=ChatResponse)
async def chat_with_llm(
    request: ChatRequest,
    db: Session = Depends(get_db)
):
    """Send message to LLM and get response"""
    return sprint_service.chat_with_llm(request, db)

@app.post("/api/sprint/finish", response_model=SprintFinishResponse)
async def finish_sprint_planning(
    request: SprintFinishRequest,
    db: Session = Depends(get_db)
):
    """Complete planning and get Grok summary"""
    return sprint_service.finish_sprint_planning(request, db)

# Mock LLM endpoint
@app.post("/api/llm/chat", response_model=LLMChatResponse)
async def llm_chat(request: LLMChatRequest):
    """Mock LLM chat endpoint"""
    return llm_service.chat(request)

# Mock Grok endpoint
@app.post("/api/grok/summarize", response_model=GrokSummarizeResponse)
async def grok_summarize(request: GrokSummarizeRequest):
    """Mock Grok summarization endpoint"""
    return grok_service.summarize(request)

# GROQ endpoint
@app.post("/api/groq/chat")
async def groq_chat(request: dict):
    """GROQ chat endpoint"""
    return groq_service.chat(request.get("messages", []), request.get("max_tokens", 1000))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 