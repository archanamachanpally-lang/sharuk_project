from sqlalchemy.orm import Session
from models import RiskAssessment
from schemas import (
    RiskAssessmentStartRequest, RiskAssessmentStartResponse,
    RiskAssessmentChatRequest, RiskAssessmentChatResponse,
    RiskAssessmentFinishRequest, RiskAssessmentFinishResponse
)
from .llm_service import llm_service

import uuid
from datetime import datetime

class RiskAssessmentService:
    def __init__(self):
        self.active_sessions = {}  # In-memory storage for demo
    
    def start_risk_assessment(self, request: RiskAssessmentStartRequest, db: Session) -> RiskAssessmentStartResponse:
        """Start a new risk assessment session"""
        try:
            # Generate risk assessment session ID
            risk_session_id = str(uuid.uuid4())
            
            # Create risk assessment session (in demo, we'll use in-memory storage)
            session_data = {
                "id": risk_session_id,
                "user_id": request.user_id or 1,
                "session_id": request.session_id,
                "status": "active",
                "responses": [],
                "created_at": datetime.now()
            }
            
            self.active_sessions[risk_session_id] = session_data
            
            return RiskAssessmentStartResponse(
                success=True,
                risk_session_id=risk_session_id,
                message="Risk assessment session started successfully"
            )
            
        except Exception as e:
            return RiskAssessmentStartResponse(
                success=False,
                risk_session_id="",
                message=f"Failed to start risk assessment: {str(e)}"
            )
    
    def chat_with_llm(self, request: RiskAssessmentChatRequest, db: Session, prompt_data: str = None) -> RiskAssessmentChatResponse:
        """Send message to LLM and get response"""
        try:
            # Get risk assessment session
            session_data = self.active_sessions.get(request.risk_session_id)
            if not session_data:
                return RiskAssessmentChatResponse(
                    success=False,
                    response="Session not found",
                    is_complete=False
                )
            
            # Add user response to session
            user_response = {
                "timestamp": datetime.now().isoformat(),
                "message": request.message,
                "type": "user"
            }
            session_data["responses"].append(user_response)
            
            # Get LLM response using prompt data from main flow
            llm_request = {
                "message": request.message,
                "context": session_data["responses"],
                "user_info": {"session_id": request.session_id}
            }
            
            llm_response = llm_service.chat(llm_request, prompt_data)
            
            # Add LLM response to session
            llm_response_data = {
                "timestamp": datetime.now().isoformat(),
                "message": llm_response["response"],
                "type": "llm",
                "is_complete": llm_response["is_complete"],
                "next_question": llm_response.get("next_question")
            }
            session_data["responses"].append(llm_response_data)
            
            return RiskAssessmentChatResponse(
                success=True,
                response=llm_response["response"],
                is_complete=llm_response["is_complete"],
                next_question=llm_response.get("next_question")
            )
            
        except Exception as e:
            return RiskAssessmentChatResponse(
                success=False,
                response=f"Error in chat: {str(e)}",
                is_complete=False
            )
    
    def finish_risk_assessment(self, request: RiskAssessmentFinishRequest, db: Session) -> RiskAssessmentFinishResponse:
        """Complete risk assessment and get summary"""
        try:
            # Get risk assessment session
            session_data = self.active_sessions.get(request.risk_session_id)
            if not session_data:
                return RiskAssessmentFinishResponse(
                    success=False,
                    summary="Session not found",
                    responses=[]
                )
            
            # Mark session as completed
            session_data["status"] = "completed"
            session_data["completed_at"] = datetime.now()
            
            # Get Gemini summary using stored prompt data
            gemini_response = llm_service.generate_risk_assessment(session_data["responses"])
            
            # Store summary in session
            session_data["summary"] = gemini_response["summary"]
            
            return RiskAssessmentFinishResponse(
                success=True,
                summary=gemini_response["summary"],
                responses=session_data["responses"]
            )
            
        except Exception as e:
            return RiskAssessmentFinishResponse(
                success=False,
                summary=f"Error generating summary: {str(e)}",
                responses=[]
            )

risk_service = RiskAssessmentService()
