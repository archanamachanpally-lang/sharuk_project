import os
import requests
import json
from typing import List, Dict, Any

class GroqService:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        self.model = os.getenv("GROQ_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"
        
    def chat(self, messages: List[Dict[str, str]], max_tokens: int = 1000) -> Dict[str, Any]:
        """Send messages to GROQ API and get response"""
        try:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }
            
            data = {
                "model": self.model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": 0.7,
                "top_p": 0.9
            }
            
            response = requests.post(self.base_url, headers=headers, json=data)
            response.raise_for_status()
            
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            
            # Debug: Print the type and content
            print(f"GROQ Response Type: {type(content)}")
            print(f"GROQ Response Content: {content[:200]}...")
            
            # Ensure we return a string, not an object
            if isinstance(content, dict):
                # If GROQ returns a JSON object, convert it to a formatted string
                import json
                content = json.dumps(content, indent=2)
            elif not isinstance(content, str):
                content = str(content)
            
            return {
                "success": True,
                "response": content,
                "usage": result.get("usage", {})
            }
            
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "response": f"GROQ API error: {str(e)}",
                "error": str(e)
            }
        except Exception as e:
            return {
                "success": False,
                "response": f"Unexpected error: {str(e)}",
                "error": str(e)
            }
    
    def generate_sprint_plan(self, conversation_history: List[Dict[str, str]]) -> Dict[str, Any]:
        """Generate a comprehensive sprint plan based on conversation history"""
        try:
            # Create a system prompt for sprint planning
            system_prompt = """You are an expert Agile coach and project manager. Based on the conversation with a user about their project, create a comprehensive sprint plan.

Please provide:
1. Project Overview
2. Sprint Goals
3. Team Structure
4. Timeline
5. Key Deliverables
6. Risk Mitigation
7. Success Metrics

IMPORTANT: Format the response as plain text with clear headings and bullet points. Do NOT return JSON or any structured format. Use markdown-style formatting with **bold** for headings and - for bullet points."""
            
            # Combine system prompt with conversation history
            messages = [{"role": "system", "content": system_prompt}]
            messages.extend(conversation_history)
            
            # Add final instruction
            messages.append({
                "role": "user", 
                "content": "Based on our conversation, please create a comprehensive sprint plan with all the details we discussed."
            })
            
            return self.chat(messages, max_tokens=1500)
            
        except Exception as e:
            return {
                "success": False,
                "response": f"Error generating sprint plan: {str(e)}",
                "error": str(e)
            }

groq_service = GroqService() 