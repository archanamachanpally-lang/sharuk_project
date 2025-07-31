from sqlalchemy.orm import Session
from models import SprintSession
from schemas import (
    SprintStartRequest, SprintStartResponse,
    ChatRequest, ChatResponse,
    SprintFinishRequest, SprintFinishResponse
)
from .llm_service import llm_service
from .grok_service import grok_service
import uuid
from datetime import datetime

class SprintService:
    def __init__(self):
        self.active_sessions = {}  # In-memory storage for demo
    
    def start_sprint_planning(self, request: SprintStartRequest, db: Session) -> SprintStartResponse:
        """Start a new sprint planning session"""
        try:
            # Generate sprint session ID
            sprint_session_id = str(uuid.uuid4())
            
            # Create sprint session (in demo, we'll use in-memory storage)
            session_data = {
                "id": sprint_session_id,
                "user_id": request.user_id or 1,
                "session_id": request.session_id,
                "status": "active",
                "responses": [],
                "created_at": datetime.now()
            }
            
            self.active_sessions[sprint_session_id] = session_data
            
            return SprintStartResponse(
                success=True,
                sprint_session_id=sprint_session_id,
                message="Sprint planning session started successfully"
            )
            
        except Exception as e:
            return SprintStartResponse(
                success=False,
                sprint_session_id="",
                message=f"Failed to start sprint planning: {str(e)}"
            )
    
    def chat_with_llm(self, request: ChatRequest, db: Session) -> ChatResponse:
        """Send message to LLM and get response"""
        try:
            # Get sprint session
            session_data = self.active_sessions.get(request.sprint_session_id)
            if not session_data:
                return ChatResponse(
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
            
            # Get LLM response
            llm_request = {
                "message": request.message,
                "context": session_data["responses"],
                "user_info": {"session_id": request.session_id}
            }
            
            llm_response = llm_service.chat(llm_request)
            
            # Add LLM response to session
            llm_response_data = {
                "timestamp": datetime.now().isoformat(),
                "message": llm_response["response"],
                "type": "llm",
                "is_complete": llm_response["is_complete"],
                "next_question": llm_response.get("next_question")
            }
            session_data["responses"].append(llm_response_data)
            
            return ChatResponse(
                success=True,
                response=llm_response["response"],
                is_complete=llm_response["is_complete"],
                next_question=llm_response.get("next_question")
            )
            
        except Exception as e:
            return ChatResponse(
                success=False,
                response=f"Error in chat: {str(e)}",
                is_complete=False
            )
    
    def finish_sprint_planning(self, request: SprintFinishRequest, db: Session) -> SprintFinishResponse:
        """Complete planning and get Grok summary"""
        try:
            # Get sprint session
            session_data = self.active_sessions.get(request.sprint_session_id)
            if not session_data:
                return SprintFinishResponse(
                    success=False,
                    summary="Session not found",
                    responses=[]
                )
            
            # Mark session as completed
            session_data["status"] = "completed"
            session_data["completed_at"] = datetime.now()
            
            # Get GROQ summary
            groq_response = llm_service.generate_sprint_plan(session_data["responses"])
            
            # Store summary in session
            session_data["summary"] = groq_response["summary"]
            
            return SprintFinishResponse(
                success=True,
                summary=groq_response["summary"],
                responses=session_data["responses"]
            )
            
        except Exception as e:
            return SprintFinishResponse(
                success=False,
                summary=f"Error generating summary: {str(e)}",
                responses=[]
            )

sprint_service = SprintService() 