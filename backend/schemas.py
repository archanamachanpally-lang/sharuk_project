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

# Risk Assessment schemas
class RiskAssessmentStartRequest(BaseModel):
    session_id: str
    user_id: Optional[int] = None

class RiskAssessmentStartResponse(BaseModel):
    success: bool
    risk_session_id: str
    message: str

class RiskAssessmentChatRequest(BaseModel):
    risk_session_id: str
    message: str
    session_id: str

class RiskAssessmentChatResponse(BaseModel):
    success: bool
    response: str
    is_complete: bool
    next_question: Optional[str] = None

class RiskAssessmentFinishRequest(BaseModel):
    risk_session_id: str
    session_id: str

class RiskAssessmentFinishResponse(BaseModel):
    success: bool
    summary: str
    responses: List[Dict[str, Any]]

# Risk Assessment Plan Generation schemas
class GenerateRiskAssessmentRequest(BaseModel):
    project_overview: dict
    risk_categories: dict
    stakeholders: dict
    risk_matrix: dict
    risk_register: dict
    additional_comments: dict
    all_risks_data: List[dict] = []  # Add the all_risks_data field
    user_email: str
    workspace_id: Optional[int] = None  # Add workspace_id to track workspace

# Feedback schemas
class FeedbackRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    clarity_of_sprint_goals: Optional[str] = None
    workload_distribution: Optional[str] = None
    plan_alignment_sow: Optional[str] = None
    suggestions_sprint_planning: Optional[str] = None
    risks_clear: Optional[str] = None
    mitigation_practical: Optional[str] = None
    suggestions_risk_assessment: Optional[str] = None
    overall_sprint_planning_rating: Optional[str] = None
    overall_risk_assessment_rating: Optional[str] = None
    additional_comments: Optional[str] = None
    user_email: Optional[str] = None

class FeedbackResponse(BaseModel):
    success: bool
    message: str
    feedback_id: Optional[int] = None 