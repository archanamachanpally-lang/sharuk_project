from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

# Authentication schemas
class LoginRequest(BaseModel):
    email: str
    name: Optional[str] = None
    google_id: Optional[str] = None

class LoginResponse(BaseModel):
    success: bool
    message: str
    session_id: Optional[str] = None
    user: Optional[Dict[str, Any]] = None

# Sprint planning schemas
class SprintStartRequest(BaseModel):
    session_id: str
    user_id: Optional[int] = None

class SprintStartResponse(BaseModel):
    success: bool
    sprint_session_id: str
    message: str

class ChatRequest(BaseModel):
    sprint_session_id: str
    message: str
    session_id: str

class ChatResponse(BaseModel):
    success: bool
    response: str
    is_complete: bool
    next_question: Optional[str] = None

class SprintFinishRequest(BaseModel):
    sprint_session_id: str
    session_id: str

class SprintFinishResponse(BaseModel):
    success: bool
    summary: str
    responses: List[Dict[str, Any]]

# LLM service schemas
class LLMChatRequest(BaseModel):
    message: str
    context: Optional[List[Dict[str, str]]] = None
    user_info: Optional[Dict[str, Any]] = None

class LLMChatResponse(BaseModel):
    response: str
    is_complete: bool
    next_question: Optional[str] = None

# Grok service schemas
class GrokSummarizeRequest(BaseModel):
    responses: List[Dict[str, Any]]
    user_info: Optional[Dict[str, Any]] = None

class GrokSummarizeResponse(BaseModel):
    summary: str
    recommendations: List[str]
    estimated_duration: str
    priority_items: List[str] 