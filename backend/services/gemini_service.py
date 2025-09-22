import os
import requests
import json
from typing import List, Dict, Any

class GeminiService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required. Please set it in your .env file.")
        self.model = "gemini-2.0-flash"
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
        
    def chat(self, messages: List[Dict[str, str]], max_tokens: int = 3000) -> Dict[str, Any]:
        """Send messages to Gemini API and get response"""
        try:
            headers = {
                "Content-Type": "application/json",
                "X-goog-api-key": self.api_key
            }
            
            # Convert OpenAI format messages to Gemini format
            contents = []
            for msg in messages:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                
                if role == "system":
                    # For system messages, prepend to user message or handle separately
                    continue
                elif role == "user":
                    contents.append({
                        "parts": [{"text": content}]
                    })
                elif role == "assistant":
                    # Gemini doesn't have assistant role in the same way, so we'll include it as context
                    contents.append({
                        "parts": [{"text": f"Assistant: {content}"}]
                    })
            
            # If we have system message, prepend it to the first user message
            if messages and messages[0].get("role") == "system":
                system_content = messages[0].get("content", "")
                if contents:
                    contents[0]["parts"][0]["text"] = f"{system_content}\n\n{contents[0]['parts'][0]['text']}"
            
            data = {
                "contents": contents
            }
            
            
            response = requests.post(self.base_url, headers=headers, json=data)
            
            if response.status_code != 200:
                response.raise_for_status()
            
            result = response.json()
            
            # Extract content from Gemini response
            if "candidates" in result and result["candidates"]:
                content = result["candidates"][0]["content"]["parts"][0]["text"]
            else:
                content = "No response generated"
            
            print(f"Gemini Response Type: {type(content)}")
            print(f"Gemini Response Content: {content[:200]}...")
            
            # Ensure we return a string, not an object
            if isinstance(content, dict):
                # If Gemini returns a JSON object, convert it to a formatted string
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
                "response": f"Gemini API error: {str(e)}",
                "error": str(e)
            }
        except Exception as e:
            return {
                "success": False,
                "response": f"Unexpected error: {str(e)}",
                "error": str(e)
            }
    
    def generate_sprint_plan(self, conversation_history: List[Dict[str, str]], prompt_data: str = None) -> Dict[str, Any]:
        """Generate a comprehensive sprint plan based on conversation history"""
        try:
            # Use the provided prompt data from global variable
            print(f"🔍 [GEMINI SERVICE] Received prompt_data type: {type(prompt_data)}")
            print(f"🔍 [GEMINI SERVICE] Received prompt_data length: {len(prompt_data) if prompt_data else 0} characters")
            print(f"🔍 [GEMINI SERVICE] Received prompt_data preview: {prompt_data[:100] if prompt_data else 'None'}...")
            
            if not prompt_data:
                print("❌ [GEMINI SERVICE] No prompt data provided")
                return {
                    "success": False,
                    "response": "No prompt data provided. Please ensure prompt is loaded from database.",
                    "error": "Missing prompt data"
                }
            
            system_prompt = prompt_data
            print(f"📦 [GEMINI SERVICE] Using system_prompt: {system_prompt[:100]}...")
            
            # Combine system prompt with conversation history
            messages = [{"role": "system", "content": system_prompt}]
            messages.extend(conversation_history)
            
            # Add final instruction
            messages.append({
                "role": "user", 
                "content": "Based on our conversation, please create a comprehensive sprint plan with all the details we discussed."
            })
            
            return self.chat(messages, max_tokens=3000)
            
        except Exception as e:
            return {
                "success": False,
                "response": f"Error generating sprint plan: {str(e)}",
                "error": str(e)
            }

    def generate_risk_assessment(self, conversation_history: List[Dict[str, str]], prompt_data: str = None) -> Dict[str, Any]:
        """Generate a comprehensive risk assessment based on conversation history"""
        try:
            # Use the provided prompt data from global variable
            print(f"🔍 [GEMINI SERVICE] Received prompt_data type: {type(prompt_data)}")
            print(f"🔍 [GEMINI SERVICE] Received prompt_data length: {len(prompt_data) if prompt_data else 0} characters")
            print(f"🔍 [GEMINI SERVICE] Received prompt_data preview: {prompt_data[:100] if prompt_data else 'None'}...")
            
            if not prompt_data:
                print("❌ [GEMINI SERVICE] No prompt data provided")
                return {
                    "success": False,
                    "response": "No prompt data provided. Please ensure prompt is loaded from database.",
                    "error": "Missing prompt data"
                }
            
            system_prompt = prompt_data
            print(f"📦 [GEMINI SERVICE] Using system_prompt: {system_prompt[:100]}...")
            
            # Combine system prompt with conversation history
            messages = [{"role": "system", "content": system_prompt}]
            messages.extend(conversation_history)
            
            # Add final instruction
            messages.append({
                "role": "user", 
                "content": "Based on our conversation, please create a comprehensive risk assessment with all the details we discussed."
            })
            
            return self.chat(messages, max_tokens=3000)
            
        except Exception as e:
            return {
                "success": False,
                "response": f"Error generating risk assessment: {str(e)}",
                "error": str(e)
            }

    def validate_and_finetune_sprint_plan(self, original_plan: str, user_inputs: str, stored_prompt: str, expected_pb_count: int) -> Dict[str, Any]:
        """Validate and fine-tune the generated sprint plan to ensure ALL PBs are included"""
        try:
            print(f"🔍 [VALIDATION] Starting sprint plan validation for {expected_pb_count} expected PBs...")
            
            # Create validation prompt
            validation_prompt = f"""
You are a quality assurance expert for sprint planning. Your task is to validate and improve the generated sprint plan.

ORIGINAL USER INPUTS:
{user_inputs}

GENERATED SPRINT PLAN TO VALIDATE:
{original_plan}

CRITICAL VALIDATION REQUIREMENTS:
1. **PB Count Verification**: The user provided {expected_pb_count} Product Backlog Items (PBs) in their input
2. **Committed Sprint Backlog**: ALL {expected_pb_count} PBs must be present in this section
3. **Detailed Task Breakdown**: ALL {expected_pb_count} PBs must have detailed task breakdowns
4. **Section Completeness**: The plan MUST include ALL required sections:
   - Sprint Overview
   - Confirmed Sprint Goal  
   - Team Capacity & Availability
   - Committed Sprint Backlog
   - Detailed Task Breakdown (CRITICAL - This section is MISSING!)
   - Definition of Done (DoD)
   - Capacity vs. Committed Effort Summary
   - Risk Management Plan
   - Key Collaboration Points & Handoffs
   - Sprint Confidence

VALIDATION INSTRUCTIONS:
- First, check if "Detailed Task Breakdown" section exists in the plan
- If "Detailed Task Breakdown" section is MISSING, the plan is INCOMPLETE
- Count the PBs in the "Committed Sprint Backlog" section
- Count the PBs in the "Detailed Task Breakdown" section (if it exists)
- If either section has fewer than {expected_pb_count} PBs, the plan is INCOMPLETE
- If the plan is incomplete, regenerate the ENTIRE sprint plan with ALL {expected_pb_count} PBs included
- Ensure each PB has comprehensive task breakdown with specific, actionable tasks
- Maintain the same professional HTML format and structure

RESPONSE FORMAT:
- If validation passes: Return the original plan with "✅ VALIDATION PASSED - All {expected_pb_count} PBs included"
- If validation fails: Return the improved plan with "🔄 PLAN REGENERATED - All {expected_pb_count} PBs now included"
- Always maintain the same HTML structure and format as the original plan

Please validate this sprint plan and ensure ALL {expected_pb_count} Product Backlog Items are included in both sections, especially the Detailed Task Breakdown section.
"""

            # Create validation messages
            validation_messages = [
                {"role": "system", "content": stored_prompt},
                {"role": "user", "content": validation_prompt}
            ]
            
            print("🔍 [VALIDATION] Sending validation request to Gemini...")
            
            # Call Gemini for validation
            validation_result = self.chat(validation_messages, max_tokens=4000)
            
            if validation_result["success"]:
                validated_plan = validation_result["response"]
                print("✅ [VALIDATION] Validation completed successfully")
                
                # Check if plan was improved or passed validation
                if "🔄 PLAN REGENERATED" in validated_plan:
                    print(f"🔄 [VALIDATION] Plan was regenerated to include all {expected_pb_count} PBs")
                    # Remove the regeneration marker for clean response
                    validated_plan = validated_plan.replace("🔄 PLAN REGENERATED - All {expected_pb_count} PBs now included", "").strip()
                elif "✅ VALIDATION PASSED" in validated_plan:
                    print(f"✅ [VALIDATION] Plan passed validation with all {expected_pb_count} PBs")
                    # Remove the validation marker for clean response
                    validated_plan = validated_plan.replace("✅ VALIDATION PASSED - All {expected_pb_count} PBs included", "").strip()
                
                return {
                    "success": True,
                    "response": validated_plan,
                    "validated": True,
                    "improved": "🔄 PLAN REGENERATED" in validation_result["response"],
                    "expected_pb_count": expected_pb_count
                }
            else:
                print(f"❌ [VALIDATION] Validation failed: {validation_result.get('error', 'Unknown error')}")
                # Return original plan if validation fails
                return {
                    "success": True,
                    "response": original_plan,
                    "validated": False,
                    "improved": False,
                    "validation_error": validation_result.get("error", "Validation failed"),
                    "expected_pb_count": expected_pb_count
                }
                
        except Exception as e:
            print(f"❌ [VALIDATION] Validation error: {str(e)}")
            # Return original plan if validation process fails
            return {
                "success": True,
                "response": original_plan,
                "validated": False,
                "improved": False,
                "validation_error": str(e),
                "expected_pb_count": expected_pb_count
            }

    def validate_and_finetune_risk_assessment(self, original_assessment: str, user_inputs: str, stored_prompt: str, expected_risk_count: int) -> Dict[str, Any]:
        """Validate and fine-tune the generated risk assessment to ensure ALL risks are included and format is correct"""
        try:
            print(f"🔍 [RISK VALIDATION] Starting risk assessment validation for {expected_risk_count} expected risks...")
            
            # Create validation prompt
            validation_prompt = f"""
You are a quality assurance expert for risk assessment. Your task is to validate and improve the generated risk assessment.

ORIGINAL USER INPUTS:
{user_inputs}

GENERATED RISK ASSESSMENT TO VALIDATE:
{original_assessment}

CRITICAL VALIDATION REQUIREMENTS:
1. **Risk Count Verification**: The user provided {expected_risk_count} risks in their input
2. **Risk Register Only**: Generate ONLY a Risk Register with ALL {expected_risk_count} risks
3. **Output Format Compliance**: Each risk MUST follow the exact HTML format:
   <div class="risk-section">
   <h3>Risk ID: [Issue Key]</h3>
   <p><strong>Risk Description:</strong> [Synthesized Description]</p>
   <p><strong>Severity:</strong> [Mapped Priority/Inferred Severity]</p>
   <p><strong>Status:</strong> [Current Status]</p>
   <p><strong>Risk Owner:</strong> [Assignee/Reporter/Creator]</p>
   <p><strong>Date Identified:</strong> [Created Date]</p>
   <p><strong>Mitigation Plan:</strong> [Extracted/Synthesized Mitigation, or N/A]</p>
   <p><strong>Relevant Notes:</strong> [Summarized Comments/Context, or N/A]</p>
   </div>

VALIDATION INSTRUCTIONS:
- Count the risks in the output
- Verify each risk follows the exact HTML format specified above
- Ensure ALL {expected_risk_count} risks are included
- Do NOT include any other sections (Executive Summary, Project Overview, Risk Categories Analysis, Stakeholder Assessment, Risk Matrix, etc.)
- If any risks are missing, regenerate the ENTIRE Risk Register with ALL {expected_risk_count} risks included
- Use proper HTML formatting with <div class="risk-section"> for each risk
- Do NOT use asterisks (*) or markdown formatting
- Focus only on the 8 specified fields for each risk
- Do NOT include any validation messages or status indicators

RESPONSE FORMAT:
- Return ONLY the Risk Register with proper HTML formatting
- Do NOT include any validation messages like "✅ VALIDATION PASSED" or "🔄 ASSESSMENT REGENERATED"
- Always maintain clean HTML structure with proper sections

Please validate this risk assessment and ensure ALL {expected_risk_count} risks are included with the correct format, removing any unnecessary stakeholder information.
"""
            
            print(f"🔍 [RISK VALIDATION] Validation prompt length: {len(validation_prompt)}")
            
            # Call Gemini with validation prompt
            messages = [
                {"role": "system", "content": validation_prompt},
                {"role": "user", "content": f"Please validate and improve this risk assessment to ensure all {expected_risk_count} risks are included with proper formatting."}
            ]
            
            print("🔍 [RISK VALIDATION] Calling Gemini service for validation...")
            gemini_response = self.chat(messages, max_tokens=4000)
            
            if not gemini_response or not gemini_response.get('success', False):
                error_msg = gemini_response.get('response', 'Unknown error from Gemini service') if gemini_response else 'No response from Gemini'
                print(f"❌ [RISK VALIDATION] Gemini service failed: {error_msg}")
                return {
                    "success": False,
                    "response": f"Validation failed: {error_msg}",
                    "error": error_msg
                }
            
            validation_result = gemini_response.get('response', '')
            print(f"✅ [RISK VALIDATION] Validation completed successfully!")
            print(f"📊 [RISK VALIDATION] Result length: {len(validation_result)} characters")
            print(f"📊 [RISK VALIDATION] Result preview: {validation_result[:200]}...")
            
            return {
                "success": True,
                "response": validation_result,
                "message": "Risk assessment validation completed successfully"
            }
            
        except Exception as e:
            print(f"❌ [RISK VALIDATION] Error: {str(e)}")
            return {
                "success": False,
                "response": f"Validation failed: {str(e)}",
                "error": str(e)
            }

gemini_service = GeminiService()
