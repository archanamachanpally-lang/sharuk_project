from schemas import LLMChatRequest, LLMChatResponse
from .gemini_service import gemini_service
import random

class LLMService:
    def __init__(self):
        self.current_question_index = 0
        self.user_context = {}
    
    def chat(self, request: dict, prompt_data: str = None) -> dict:
        """Mock LLM chat that simulates dynamic question generation"""
        try:
            message = request.get("message", "").lower()
            context = request.get("context", [])
            user_info = request.get("user_info", {})
            
            # Use prompt data if provided
            if prompt_data:
                print(f"[TERMINAL LOG] LLM Service: Using prompt data from main flow for chat: {prompt_data[:100]}...")
            
            # Extract user name from context if available
            user_name = self._extract_user_name(context)
            
            # Check if user wants to finish
            if "finish" in message or "complete" in message or "done" in message:
                return {
                    "response": f"Great! Thank you {user_name or 'there'} for completing the sprint planning session. I'll now generate a summary of your responses.",
                    "is_complete": True,
                    "next_question": None
                }
            
            # Determine which question to ask based on context
            question_index = self._get_next_question_index(context)
            
            if question_index < len(self.question_flow):
                question = self.question_flow[question_index]
                
                # Personalize question if we have user name
                if user_name and "name" not in question.lower():
                    question = f"{question} {user_name}?"
                
                return {
                    "response": question,
                    "is_complete": False,
                    "next_question": self.question_flow[question_index + 1] if question_index + 1 < len(self.question_flow) else None
                }
            else:
                return {
                    "response": f"Thank you {user_name or 'there'}! I have all the information I need. You can say 'finish' to complete the planning session.",
                    "is_complete": True,
                    "next_question": None
                }
                
        except Exception as e:
            return {
                "response": f"I encountered an error: {str(e)}. Please try again.",
                "is_complete": False,
                "next_question": None
            }
    
    def _extract_user_name(self, context: list) -> str:
        """Extract user name from conversation context"""
        for response in context:
            if response.get("type") == "user":
                message = response.get("message", "").lower()
                if "my name is" in message:
                    # Extract name after "my name is"
                    name_part = message.split("my name is")[-1].strip()
                    if name_part:
                        return name_part.split()[0].title()
                elif "i'm" in message and "name" in message:
                    # Extract name after "i'm"
                    name_part = message.split("i'm")[-1].strip()
                    if name_part:
                        return name_part.split()[0].title()
        return ""
    
    def _get_next_question_index(self, context: list) -> int:
        """Determine which question to ask based on conversation context"""
        user_responses = [r for r in context if r.get("type") == "user"]
        return len(user_responses)
    
    def generate_sprint_plan(self, conversation_history: list, prompt_data: str = None) -> dict:
        """Generate sprint plan using Gemini"""
        try:
            # Use prompt data if provided
            if prompt_data:
                print(f"[TERMINAL LOG] LLM Service: Using prompt data from main flow for sprint plan generation: {prompt_data[:100]}...")
            
            # Convert conversation history to Gemini format
            messages = []
            for msg in conversation_history:
                if msg.get("type") == "user":
                    messages.append({"role": "user", "content": msg.get("message", "")})
                elif msg.get("type") == "llm":
                    messages.append({"role": "assistant", "content": msg.get("message", "")})
            
            # Generate sprint plan using Gemini with prompt data
            result = gemini_service.generate_sprint_plan(messages, prompt_data)
            
            if result["success"]:
                return {
                    "success": True,
                    "summary": result["response"],
                    "usage": result.get("usage", {})
                }
            else:
                return {
                    "success": False,
                    "summary": result["response"],
                    "error": result.get("error", "Unknown error")
                }
                
        except Exception as e:
            return {
                "success": False,
                "summary": f"Error generating sprint plan: {str(e)}",
                "error": str(e)
            }

    def generate_risk_assessment(self, conversation_history: list, prompt_data: str = None) -> dict:
        """Generate risk assessment using Gemini"""
        try:
            # Use prompt data if provided
            if prompt_data:
                print(f"[TERMINAL LOG] LLM Service: Using prompt data from main flow for risk assessment generation: {prompt_data[:100]}...")
            
            # Convert conversation history to Gemini format
            messages = []
            for msg in conversation_history:
                if msg.get("type") == "user":
                    messages.append({"role": "user", "content": msg.get("message", "")})
                elif msg.get("type") == "llm":
                    messages.append({"role": "assistant", "content": msg.get("message", "")})
            
            # Generate risk assessment using Gemini with prompt data
            result = gemini_service.generate_risk_assessment(messages, prompt_data)
            
            if result["success"]:
                return {
                    "success": True,
                    "summary": result["response"],
                    "usage": result.get("usage", {})
                }
            else:
                return {
                    "success": False,
                    "summary": result["response"],
                    "error": result.get("error", "Unknown error")
                }
                
        except Exception as e:
            return {
                "success": False,
                "summary": f"Error generating risk assessment: {str(e)}",
                "error": str(e)
            }

llm_service = LLMService() 