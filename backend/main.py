from fastapi import FastAPI, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
import os
from dotenv import load_dotenv

from database import get_db, engine
from models import Base, Feedback
from schemas import (
    LoginRequest, LoginResponse, 
    SprintStartRequest, SprintStartResponse,
    ChatRequest, ChatResponse,
    LLMChatRequest, LLMChatResponse,
    RiskAssessmentStartRequest, RiskAssessmentStartResponse,
    RiskAssessmentChatRequest, RiskAssessmentChatResponse,
    RiskAssessmentFinishRequest, RiskAssessmentFinishResponse,
    GenerateRiskAssessmentRequest,
    FeedbackRequest, FeedbackResponse
)
from services import (
    auth_service, sprint_service, 
    llm_service, gemini_service, db_service
)
from services.risk_service import risk_service
from services.docx_service import docx_service
from services.risk_docx_service import risk_docx_service
from services.pdf_service import pdf_service

# Load environment variables
load_dotenv()

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Sprint Planning Demo API",
    description="A demo API for sprint planning with LLM integration",
    version="1.0.0"
)

# Global variable to store prompt data in main flow
GLOBAL_PROMPT_DATA = None

def get_global_prompt_data():
    """Get the global prompt data stored in main flow"""
    global GLOBAL_PROMPT_DATA
    print(f"🔍 [GLOBAL PROMPT] Variable Name: GLOBAL_PROMPT_DATA")
    print(f"🔍 [GLOBAL PROMPT] Variable Value: {GLOBAL_PROMPT_DATA[:100] if GLOBAL_PROMPT_DATA else 'None'}...")
    print(f"🔍 [GLOBAL PROMPT] Variable Type: {type(GLOBAL_PROMPT_DATA)}")
    return GLOBAL_PROMPT_DATA

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000,http://192.168.11.101:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Sprint Planning Demo API", "status": "running"}

# Authentication endpoints
@app.get("/api/auth/google/url")
async def get_google_auth_url(prompt: str = None):
    """Get Google OAuth URL"""
    try:
        auth_url = auth_service.get_google_auth_url(prompt=prompt)
        return {"auth_url": auth_url}
    except ValueError as e:
        return {"error": str(e), "auth_url": None}
    except Exception as e:
        return {"error": f"Failed to generate Google OAuth URL: {str(e)}", "auth_url": None}

from pydantic import BaseModel

class GoogleCallbackRequest(BaseModel):
    code: str

class EditSprintPlanRequest(BaseModel):
    sprint_overview: dict
    team_capacity: dict
    product_backlog: dict
    definition_of_done: dict
    risks_and_impediments: dict
    additional_comments: dict
    edit_comments: str
    edited_by: str

def generate_word_document_content(generated_plan: str, user_inputs: dict) -> str:
    """Generate Word document content that is a replica of HTML rendered output"""
    try:
        # Remove markdown code blocks but keep HTML formatting
        html_content = generated_plan or ''
        import re
        html_content = re.sub(r'```html\s*', '', html_content, flags=re.IGNORECASE)
        html_content = re.sub(r'```\s*$', '', html_content, flags=re.IGNORECASE)
        html_content = html_content.strip()
        
        if not html_content:
            return '<p>No content available for Word document.</p>'
        
        # Create Word-compatible HTML with all formatting preserved
        word_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Sprint Plan - {user_inputs.get('sprint_overview', {}).get('SprintNumber', 'N/A')}</title>
            <style>
                body {{
                    font-family: 'Calibri', 'Arial', sans-serif;
                    margin: 20px;
                    padding: 0;
                    background: white;
                    color: #2c3e50;
                    line-height: 1.6;
                    font-size: 11pt;
                }}
                h1, h2, h3, h4 {{
                    color: #2d3748;
                    margin: 20px 0 15px 0;
                    font-weight: 600;
                }}
                h1 {{ font-size: 18pt; }}
                h2 {{ font-size: 16pt; }}
                h3 {{ font-size: 14pt; }}
                h4 {{ font-size: 12pt; }}
                p {{ margin: 10px 0; }}
                table {{
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                    border: 1px solid #ddd;
                }}
                th, td {{
                    border: 1px solid #ddd;
                    padding: 8px 12px;
                    text-align: left;
                    vertical-align: top;
                }}
                th {{
                    background-color: #f8f9fa;
                    font-weight: bold;
                    color: #2d3748;
                }}
                ul, ol {{ 
                    margin: 15px 0; 
                    padding-left: 30px; 
                }}
                li {{ 
                    margin: 8px 0; 
                    line-height: 1.6;
                }}
                strong {{
                    color: #2d3748;
                    font-weight: 600;
                }}
                em {{
                    color: #718096;
                    font-style: italic;
                }}
                .sprint-header {{
                    background: #f7fafc;
                    border: 2px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 20px;
                    text-align: center;
                }}
                .sprint-header h1 {{
                    margin: 0 0 10px 0;
                    color: #1a202c;
                }}
                .sprint-header p {{
                    margin: 0;
                    color: #4a5568;
                    font-size: 12pt;
                }}
            </style>
        </head>
        <body>
            <div class="sprint-header">
                <h1>Sprint Plan - Sprint {user_inputs.get('sprint_overview', {}).get('SprintNumber', 'N/A')}</h1>
                <p>Generated on {__import__('datetime').datetime.now().strftime('%Y-%m-%d')}</p>
            </div>
            
            {html_content}
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #718096; font-size: 10pt;">
                <p>This sprint plan was automatically generated by the Sprint Planning System</p>
                <p>Document ID: SP-{user_inputs.get('sprint_overview', {}).get('SprintNumber', 'N/A')}-{__import__('datetime').datetime.now().strftime('%Y-%m-%d')}</p>
            </div>
        </body>
        </html>
        """
        
        return word_html.strip()
        
    except Exception as e:
        print(f"❌ [WORD GENERATION] Error generating Word document: {str(e)}")
        return f'<p>Error generating Word document: {str(e)}</p>'

class DownloadVersionRequest(BaseModel):
    version_number: int

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

@app.post("/api/upload/docx")
async def upload_docx_file(file: UploadFile = File(...), feature_type: str = "sprint"):
    """Upload and parse DOCX file for data extraction"""
    try:
        # Validate file type
        if not file.filename.lower().endswith('.docx'):
            return {
                "success": False,
                "error": "Invalid file type. Please upload a .docx file."
            }
        
        # Read file content
        file_content = await file.read()
        
        # Use appropriate service based on feature type
        if feature_type == "risk-assessment":
            result = risk_docx_service.parse_docx_file(file_content)
        else:
            result = docx_service.parse_docx_file(file_content)
        
        if result['success']:
            print(f"🔍 [MAIN] Sending data to frontend: {result['data']}")
            return {
                "success": True,
                "data": result['data'],
                "message": result['message']
            }
        else:
            return {
                "success": False,
                "error": result['message']
            }
            
    except Exception as e:
        return {
            "success": False,
            "error": f"Error processing file: {str(e)}"
        }

# SOW upload endpoint: supports both DOCX and PDF files; prints content to console and returns raw text
@app.post("/api/upload/sow")
async def upload_sow_document(file: UploadFile = File(...), user_email: str = Form(None)):
    """Upload SOW document (DOCX or PDF), print raw text to server console, return raw text back."""
    try:
        file_extension = file.filename.lower().split('.')[-1]
        
        if file_extension not in ['docx', 'pdf']:
            return {"success": False, "error": "Invalid file type. Please upload a .docx or .pdf file."}

        file_content = await file.read()
        raw_text = ""

        if file_extension == 'docx':
            # Convert DOCX to HTML preserving formatting
            from docx import Document
            import io
            import re

            doc = Document(io.BytesIO(file_content))
            html_parts = []
            
            # Process paragraphs
            for p in doc.paragraphs:
                if p.text.strip():
                    # Check if paragraph has heading style
                    if p.style.name.startswith('Heading'):
                        level = p.style.name.replace('Heading ', '')
                        html_parts.append(f'<h{level}>{p.text.strip()}</h{level}>')
                    else:
                        # Check for bold/italic runs
                        para_html = ""
                        for run in p.runs:
                            text = run.text
                            if run.bold:
                                text = f"<strong>{text}</strong>"
                            if run.italic:
                                text = f"<em>{text}</em>"
                            para_html += text
                        
                        if para_html.strip():
                            html_parts.append(f'<p>{para_html}</p>')
            
            # Process tables
            for table in doc.tables:
                html_parts.append('<table border="1" style="border-collapse: collapse; width: 100%; margin: 10px 0;">')
                for row_idx, row in enumerate(table.rows):
                    html_parts.append('<tr>')
                    for cell in row.cells:
                        cell_text = cell.text.strip()
                        if cell_text:
                            # Check if it's a header row (usually first row)
                            tag = 'th' if row_idx == 0 else 'td'
                            html_parts.append(f'<{tag} style="padding: 8px; border: 1px solid #ddd;">{cell_text}</{tag}>')
                        else:
                            tag = 'th' if row_idx == 0 else 'td'
                            html_parts.append(f'<{tag} style="padding: 8px; border: 1px solid #ddd;">&nbsp;</{tag}>')
                    html_parts.append('</tr>')
                html_parts.append('</table>')
            
            # Join HTML parts
            html_content = '\n'.join(html_parts)
            
            # Also create raw text version for backward compatibility
            raw_text = "\n".join([p.text.strip() for p in doc.paragraphs if p.text.strip()])
            
        elif file_extension == 'pdf':
            # Extract raw text from PDF using our PDF service
            pdf_result = pdf_service.extract_text_from_pdf(file_content)
            
            if not pdf_result['success']:
                return {"success": False, "error": f"Error extracting text from PDF: {pdf_result['error']}"}
            
            raw_text = pdf_result['text'].strip()
            print(f"📄 [PDF EXTRACTION] Used method: {pdf_result.get('method', 'Unknown')}")

        if not raw_text:
            return {"success": False, "error": "No text content found in the document."}

        # Print to terminal/console
        print("=" * 80)
        print(f"📄 [SOW UPLOAD] File: {file.filename} ({file_extension.upper()})")
        print("— Raw Document Text —")
        print(raw_text if raw_text else "<No text content>")
        print("=" * 80)

        # Return both HTML and raw text
        response_data = {
            "rawText": raw_text, 
            "fileName": file.filename, 
            "fileType": file_extension
        }
        
        # Add HTML content for DOCX files
        if file_extension == 'docx' and 'html_content' in locals():
            response_data["htmlContent"] = html_content
        
        return {"success": True, "data": response_data}
    except Exception as e:
        return {"success": False, "error": f"Error processing SOW file: {str(e)}"}

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
    return sprint_service.chat_with_llm(request, db, get_global_prompt_data())

@app.get("/api/sprint/prompt")
async def get_sprint_prompt(db: Session = Depends(get_db)):
    """Fetch prompt data from documents table for sprint planning"""
    global GLOBAL_PROMPT_DATA
    try:
        # Print the SQL query being executed
        print("🔍 [PROMPT FETCH] SQL Query: SELECT * FROM documents WHERE feature = 'SprintPlan' LIMIT 1")
        
        # Use raw SQL instead of ORM to avoid importing Document
        result = db.execute(text("SELECT id, prompt, feature FROM documents WHERE feature = 'SprintPlan' LIMIT 1"))
        row = result.fetchone()
        
        if row:
            # Store the prompt data in the global variable in main flow
            GLOBAL_PROMPT_DATA = row.prompt
            
            # Print variable details
            print(f"📦 [PROMPT FETCH] Variable Name: GLOBAL_PROMPT_DATA")
            print(f"📦 [PROMPT FETCH] Variable Type: {type(GLOBAL_PROMPT_DATA)}")
            print(f"📦 [PROMPT FETCH] Variable Length: {len(GLOBAL_PROMPT_DATA) if GLOBAL_PROMPT_DATA else 0} characters")
            print(f"📦 [PROMPT FETCH] Variable Content (first 200 chars): {GLOBAL_PROMPT_DATA[:200] if GLOBAL_PROMPT_DATA else 'None'}...")
            print(f"📦 [PROMPT FETCH] Document ID: {row.id}")
            print(f"📦 [PROMPT FETCH] Document Feature: {row.feature}")
            
            return {
                "success": True,
                "prompt": row.prompt,
                "feature": row.feature
            }
        else:
            print("❌ [PROMPT FETCH] No document found with feature = 'SprintPlan'")
            return {
                "success": False,
                "prompt": "",
                "feature": "",
                "message": "No prompt data found for SprintPlan"
            }
    except Exception as e:
        print(f"❌ [PROMPT FETCH] Error: {str(e)}")
        return {
            "success": False,
            "prompt": "",
            "feature": "",
            "message": f"Error fetching prompt data: {str(e)}"
        }

@app.get("/api/feature/prompt/{feature_name}")
async def get_feature_prompt(feature_name: str, db: Session = Depends(get_db)):
    """Fetch prompt data from documents table for specific features"""
    try:
        # Map feature names to database feature values
        feature_mapping = {
            "weekly-status-report": "WeeklyStatusReport",
            "risk-assessment": "RiskAssessment"
        }
        
        db_feature_name = feature_mapping.get(feature_name, feature_name)
        
        # Print the SQL query being executed
        print(f"🔍 [FEATURE PROMPT FETCH] SQL Query: SELECT * FROM documents WHERE feature = '{db_feature_name}' LIMIT 1")
        
        # Use raw SQL instead of ORM to avoid importing Document
        result = db.execute(text(f"SELECT id, prompt, feature FROM documents WHERE feature = '{db_feature_name}' LIMIT 1"))
        row = result.fetchone()
        
        if row:
            # Print variable details
            print(f"📦 [FEATURE PROMPT FETCH] Successfully fetched prompt for feature: {feature_name}")
            print(f"📦 [FEATURE PROMPT FETCH] Document ID: {row.id}")
            print(f"📦 [FEATURE PROMPT FETCH] Document Feature: {row.feature}")
            print(f"📦 [FEATURE PROMPT FETCH] Prompt Length: {len(row.prompt) if row.prompt else 0} characters")
            print(f"📦 [FEATURE PROMPT FETCH] Prompt Content (first 200 chars): {row.prompt[:200] if row.prompt else 'None'}...")
            
            return {
                "success": True,
                "prompt": row.prompt,
                "feature": row.feature
            }
        else:
            print(f"❌ [FEATURE PROMPT FETCH] No document found with feature = '{db_feature_name}'")
            return {
                "success": False,
                "prompt": "",
                "feature": "",
                "message": f"No prompt data found for {feature_name}"
            }
    except Exception as e:
        print(f"❌ [FEATURE PROMPT FETCH] Error: {str(e)}")
        return {
            "success": False,
            "prompt": "",
            "feature": "",
            "message": f"Error fetching prompt data for {feature_name}: {str(e)}"
        }

# Finish sprint implementation
class QAItem(BaseModel):
    question: str
    answer: str

class CustomSprintFinishRequest(BaseModel):
    qa_list: List[QAItem]

@app.post("/api/sprint/finish")
async def finish_sprint_custom(request: CustomSprintFinishRequest, db: Session = Depends(get_db)):
    """Generate sprint plan summary based on custom Q&A list using Gemini and save to CSV"""
    try:
        from services.gemini_service import gemini_service
        from services.csv_service import csv_service
        from services.db_service import db_service
        
        # Use the stored prompt data from global variable in main flow
        print("🔍 [FINISH ENDPOINT] Getting stored prompt from global variable...")
        stored_prompt = get_global_prompt_data()
        
        if not stored_prompt:
            # Fallback to querying table if no stored prompt
            print("🔍 [FINISH ENDPOINT] No stored prompt found, querying database...")
            from sqlalchemy import text
            fallback_query = "SELECT prompt FROM documents WHERE feature = 'SprintPlan'"
            print(f"🔍 [FINISH ENDPOINT] Fallback SQL Query: {fallback_query}")
            result = db.execute(text(fallback_query))
            row = result.fetchone()
            if not row:
                print("❌ [FINISH ENDPOINT] No prompt found in database")
                return {"success": False, "message": "Reference prompt not found in database"}
            stored_prompt = row[0]
            print(f"📦 [FINISH ENDPOINT] Retrieved prompt from database: {stored_prompt[:100]}...")
            # Store it in global variable for future use
            GLOBAL_PROMPT_DATA = stored_prompt
        else:
            print(f"📦 [FINISH ENDPOINT] Using stored prompt from global variable: {stored_prompt[:100]}...")
        
        # Add the Q&A data to the stored prompt structure
        qa_data = ""
        for item in request.qa_list:
            qa_data += f"{item.question}: {item.answer}\n"
        
        # Combine the stored prompt with the Q&A data
        full_prompt = f"{stored_prompt}\n\nSprint Planning Information:\n{qa_data}"
        
        # Use Gemini to generate the summary
        messages = [
            {"role": "system", "content": stored_prompt},  # Use the global prompt data
            {"role": "user", "content": full_prompt}
        ]
        
        result = gemini_service.chat(messages, max_tokens=3000)
        
        if result["success"]:
            # Convert Q&A list to user_inputs format for CSV and database
            user_inputs = {}
            
            # Define the mapping from form field names to CSV column names
            field_mapping = {
                'sprint number': 'sprint_number',
                'sprint dates': 'sprint_dates', 
                'sprint duration': 'sprint_duration',
                'team name': 'team_name',
                'sprint goal': 'sprint_goal',
                'working hour per person': 'working_hours_per_person',
                'team availability': 'team_member_availability',
                'story points history': 'historical_story_points',
                'pbi summary': 'pbi_summary',
                'pbi criteria': 'pbi_criteria',
                'pbi priority': 'pbi_priority',
                'pbi effort': 'pbi_effort',
                'definition of done': 'definition_of_done',
                'risk dependencies': 'risks_and_dependencies'
            }
            
            for item in request.qa_list:
                # Map the question names to CSV column names
                question_lower = item.question.lower()
                csv_column = field_mapping.get(question_lower, question_lower.replace(" ", "_"))
                user_inputs[csv_column] = item.answer
            
            # Save to CSV
            csv_result = csv_service.save_sprint_plan(user_inputs)
            
            # Save to database
            db_result = db_service.save_sprint_plan(db, user_inputs)
            
            return {
                "success": True, 
                "summary": result["response"],
                "csv_saved": csv_result["success"],
                "csv_message": csv_result.get("message", ""),
                "db_saved": db_result["success"],
                "db_message": db_result.get("message", ""),
                "plan_id": db_result.get("plan_id")
            }
        else:
            return {"success": False, "message": result["response"]}

    except Exception as e:
        return {"success": False, "message": f"Failed to generate summary: {str(e)}"}

# New endpoint for generating plans with the new structure
class GeneratePlanRequest(BaseModel):
    sprint_overview: dict
    team_capacity: dict
    product_backlog: dict
    definition_of_done: dict
    risks_and_impediments: dict
    additional_comments: dict
    sow_content: str | None = None
    current_plan_content: str | None = None  # Include current plan for regeneration
    regenerate_with_current_plan: bool = False  # Flag to indicate regeneration
    user_email: str  # Add user email to track who created the plan

# Update SOW content for existing sprint plan
@app.post("/api/sprint/validate-plan")
async def validate_sprint_plan(request: dict, db: Session = Depends(get_db)):
    """Validate sprint plan against SOW using Planvalidation prompt"""
    try:
        sprint_plan_content = request.get('sprint_plan_content', '')
        sow_content = request.get('sow_content', '')
        
        if not sprint_plan_content or not sow_content:
            return {"success": False, "error": "Missing required fields: sprint_plan_content and sow_content"}
        
        print("=" * 80)
        print("✅ [VALIDATE PLAN] REQUEST RECEIVED")
        print("=" * 80)
        print(f"📋 [VALIDATE PLAN] Sprint Plan Content Length: {len(sprint_plan_content)}")
        print(f"📋 [VALIDATE PLAN] SOW Content Length: {len(sow_content)}")
        print("=" * 80)
        
        from services.gemini_service import gemini_service
        
        # Get Planvalidation prompt from database
        result = db.execute(text("SELECT prompt FROM documents WHERE feature = 'Planvalidation' LIMIT 1"))
        row = result.fetchone()
        
        if not row:
            print("❌ [VALIDATE PLAN] No Planvalidation prompt found in database!")
            return {"success": False, "error": "Planvalidation prompt not found in database"}
        
        validation_prompt = row[0]
        print(f"🔍 [VALIDATE PLAN] Using validation prompt: {len(validation_prompt)} characters")
        print(f"🔍 [VALIDATE PLAN] Prompt preview: {validation_prompt[:200]}...")
        
        # Prepare the validation request
        validation_data = f"""
SPRINT PLAN TO VALIDATE:
{sprint_plan_content[:15000]}  # Limit to avoid token limits

STATEMENT OF WORK (SOW) FOR COMPARISON:
{sow_content[:15000]}  # Limit to avoid token limits

Please validate the sprint plan against the SOW and provide:
1. Percentage alignment (e.g., "85% aligned")
2. Areas that are out of scope
3. Technical boundary compliance
4. Resource allocation alignment
"""
        
        print(f"🔍 [VALIDATE PLAN] Validation data length: {len(validation_data)}")
        
        # Call Gemini service with validation prompt
        messages = [
            {"role": "system", "content": validation_prompt},
            {"role": "user", "content": validation_data}
        ]
        
        print("🔍 [GEMINI CALL] Calling Gemini service for validation...")
        gemini_response = gemini_service.chat(messages, max_tokens=2000)
        
        if not gemini_response or not gemini_response.get('success', False):
            error_msg = gemini_response.get('response', 'Unknown error from Gemini service') if gemini_response else 'No response from Gemini'
            print(f"❌ [VALIDATE PLAN] Gemini service failed: {error_msg}")
            return {"success": False, "error": f"Gemini validation failed: {error_msg}"}
        
        validation_result = gemini_response.get('response', '')
        print(f"✅ [VALIDATE PLAN] Validation completed successfully!")
        print(f"📊 [VALIDATE PLAN] Result length: {len(validation_result)} characters")
        print(f"📊 [VALIDATE PLAN] Result preview: {validation_result[:200]}...")
        
        return {
            "success": True,
            "response": validation_result,
            "message": "Sprint plan validation completed successfully"
        }
        
    except Exception as e:
        print(f"❌ [VALIDATE PLAN] Error: {str(e)}")
        return {"success": False, "error": f"Error validating sprint plan: {str(e)}"}

@app.post("/api/risk/validate-assessment")
async def validate_risk_assessment(request: dict, db: Session = Depends(get_db)):
    """Validate risk assessment against SOW using Riskvalidation prompt"""
    try:
        risk_assessment_content = request.get('risk_assessment_content', '')
        sow_content = request.get('sow_content', '')
        
        if not risk_assessment_content or not sow_content:
            return {"success": False, "error": "Missing required fields: risk_assessment_content and sow_content"}
        
        print("=" * 80)
        print("✅ [VALIDATE RISK ASSESSMENT] REQUEST RECEIVED")
        print("=" * 80)
        print(f"📋 [VALIDATE RISK ASSESSMENT] Risk Assessment Content Length: {len(risk_assessment_content)}")
        print(f"📋 [VALIDATE RISK ASSESSMENT] SOW Content Length: {len(sow_content)}")
        print("=" * 80)
        
        from services.gemini_service import gemini_service
        
        # Get Riskvalidation prompt from database
        result = db.execute(text("SELECT prompt FROM documents WHERE feature = 'Riskvalidation' LIMIT 1"))
        row = result.fetchone()
        
        if not row:
            print("❌ [VALIDATE RISK ASSESSMENT] No Riskvalidation prompt found in database!")
            return {"success": False, "error": "Riskvalidation prompt not found in database"}
        
        validation_prompt = row[0]
        print(f"🔍 [VALIDATE RISK ASSESSMENT] Using validation prompt: {len(validation_prompt)} characters")
        print(f"🔍 [VALIDATE RISK ASSESSMENT] Prompt preview: {validation_prompt[:200]}...")
        
        # Prepare the validation request
        validation_data = f"""
RISK ASSESSMENT TO VALIDATE:
{risk_assessment_content[:15000]}  # Limit to avoid token limits

STATEMENT OF WORK (SOW) FOR COMPARISON:
{sow_content[:15000]}  # Limit to avoid token limits

Please validate the risk assessment against the SOW and provide:
1. Percentage alignment (e.g., "85% aligned")
2. Areas that are out of scope
3. Risk coverage compliance
4. Regulatory alignment
"""
        
        print(f"🔍 [VALIDATE RISK ASSESSMENT] Validation data length: {len(validation_data)}")
        
        # Call Gemini service with validation prompt
        messages = [
            {"role": "system", "content": validation_prompt},
            {"role": "user", "content": validation_data}
        ]
        
        gemini_response = gemini_service.chat(messages, max_tokens=2000)
        
        if not gemini_response or not gemini_response.get('success', False):
            error_msg = gemini_response.get('response', 'Unknown error from Gemini service') if gemini_response else 'No response from Gemini'
            print(f"❌ [VALIDATE RISK ASSESSMENT] Gemini service failed: {error_msg}")
            return {"success": False, "error": f"Gemini validation failed: {error_msg}"}
        
        validation_result = gemini_response.get('response', '')
        print(f"✅ [VALIDATE RISK ASSESSMENT] Validation completed successfully!")
        print(f"📊 [VALIDATE RISK ASSESSMENT] Result length: {len(validation_result)} characters")
        print(f"📊 [VALIDATE RISK ASSESSMENT] Result preview: {validation_result[:200]}...")
        
        return {
            "success": True,
            "response": validation_result,
            "message": "Risk assessment validation completed successfully"
        }
        
    except Exception as e:
        print(f"❌ [VALIDATE RISK ASSESSMENT] Error: {str(e)}")
        return {"success": False, "error": f"Error validating risk assessment: {str(e)}"}

@app.post("/api/sprint/update-sow")
async def update_sow_content(request: dict, db: Session = Depends(get_db)):
    """Update SOW content for an existing sprint plan"""
    try:
        sprint_plan_id = request.get('sprint_plan_id')
        sow_content = request.get('sow_content')
        sow_file_name = request.get('sow_file_name', 'Updated SOW')
        
        if not sprint_plan_id or not sow_content:
            return {"success": False, "error": "Missing required fields: sprint_plan_id and sow_content"}
        
        # Find the sprint plan
        from models import SprintPlan
        sprint_plan = db.query(SprintPlan).filter(SprintPlan.id == sprint_plan_id).first()
        
        if not sprint_plan:
            return {"success": False, "error": "Sprint plan not found"}
        
        # Update the SOW content
        sprint_plan.sow_content = sow_content
        db.commit()
        
        print(f"✅ [SOW UPDATE] Updated SOW content for sprint plan {sprint_plan_id}")
        print(f"📄 [SOW UPDATE] File: {sow_file_name}")
        print(f"📄 [SOW UPDATE] Content length: {len(sow_content)}")
        
        return {"success": True, "message": "SOW content updated successfully"}
        
    except Exception as e:
        print(f"❌ [SOW UPDATE] Error: {str(e)}")
        return {"success": False, "error": f"Error updating SOW content: {str(e)}"}

@app.post("/api/sprint/generate-plan")
async def generate_sprint_plan(request: GeneratePlanRequest, db: Session = Depends(get_db)):
    """Generate sprint plan with new structure"""
    try:
        import json
        
        # Log the complete JSON request data
        print("=" * 80)
        print("🚀 [GENERATE SPRINT PLAN] REQUEST RECEIVED")
        print("=" * 80)
        print("📋 [GENERATE SPRINT PLAN] Complete JSON Request Data:")
        print("=" * 80)
        
        # Convert request to dict for logging
        request_dict = {
            "sprint_overview": request.sprint_overview,
            "team_capacity": request.team_capacity,
            "product_backlog": request.product_backlog,
            "definition_of_done": request.definition_of_done,
            "risks_and_impediments": request.risks_and_impediments,
            "additional_comments": request.additional_comments
        }
        
        # Pretty print the JSON
        print(json.dumps(request_dict, indent=2, ensure_ascii=False))
        print("=" * 80)
        print("📊 [GENERATE SPRINT PLAN] Request Summary:")
        print(f"   - Sprint Overview Keys: {list(request.sprint_overview.keys())}")
        print(f"   - Team Capacity Keys: {list(request.team_capacity.keys())}")
        print(f"   - Product Backlog Keys: {list(request.product_backlog.keys())}")
        print(f"   - Definition of Done Keys: {list(request.definition_of_done.keys())}")
        print(f"   - Risks & Impediments Keys: {list(request.risks_and_impediments.keys())}")
        print(f"   - Additional Comments Keys: {list(request.additional_comments.keys())}")
        
        # Log specific data points
        print("📝 [GENERATE SPRINT PLAN] Key Data Points:")
        print(f"   - Sprint Number: {request.sprint_overview.get('SprintNumber', 'N/A')}")
        print(f"   - Team Name: {request.sprint_overview.get('TeamName', 'N/A')}")
        print(f"   - Number of Team Members: {request.team_capacity.get('NumberOfMembers', 'N/A')}")
        print(f"   - Number of Backlog Items: {len(request.product_backlog.get('BacklogItems', []))}")
        print(f"   - DoD Content Length: {len(request.definition_of_done.get('DoDContent', ''))}")
        print(f"   - Risks Content Length: {len(request.risks_and_impediments.get('RisksContent', ''))}")
        print(f"   - Additional Comments Length: {len(request.additional_comments.get('CommentsContent', ''))}")
        print("=" * 80)
        
        from services.gemini_service import gemini_service
        from services.db_service import db_service
        
        # Get stored prompt from global variable or fetch from DB
        stored_prompt = get_global_prompt_data()
        if not stored_prompt:
            # Fallback: fetch from database
            print("🔍 [PROMPT LOADING] Global prompt is None, fetching from database...")
            result = db.execute(text("SELECT id, prompt, feature FROM documents WHERE feature = 'SprintPlan' LIMIT 1"))
            row = result.fetchone()
            if row:
                stored_prompt = row[1]
                # Update global variable for future use
                global GLOBAL_PROMPT_DATA
                GLOBAL_PROMPT_DATA = stored_prompt
                print(f"🔍 [PROMPT LOADING] Loaded prompt from database: {len(stored_prompt)} characters")
            else:
                print("❌ [PROMPT LOADING] No prompt found in database!")
                return {"success": False, "message": "No prompt found in database"}
        else:
            print(f"🔍 [PROMPT LOADING] Using global prompt: {len(stored_prompt)} characters")
        
        print(f"🔍 [GENERATE PLAN] Final prompt length: {len(stored_prompt)} characters")
        print(f"🔍 [GENERATE PLAN] Prompt preview: {stored_prompt[:200]}...")
        
        # Validate that we have a proper prompt
        if not stored_prompt or len(stored_prompt.strip()) < 50:
            print("❌ [PROMPT VALIDATION] Prompt is too short or empty!")
            return {"success": False, "message": "Invalid prompt data. Please ensure prompt is properly loaded."}
        
        # Format user inputs into prompt template
        user_inputs = {
            "sprint_overview": request.sprint_overview,
            "team_capacity": request.team_capacity,
            "product_backlog": request.product_backlog,
            "definition_of_done": request.definition_of_done,
            "risks_and_impediments": request.risks_and_impediments,
            "additional_comments": request.additional_comments
        }
        
        # Format user inputs properly
        team_members_text = ""
        if user_inputs['team_capacity'].get('TeamMembers'):
            team_members_text = "\n".join([
                f"- {member.get('roleName', 'N/A')}: {member.get('workingHours', 'N/A')}"
                for member in user_inputs['team_capacity'].get('TeamMembers', [])
            ])

        backlog_items_text = ""
        if user_inputs['product_backlog'].get('BacklogItems'):
            backlog_items_text = "\n".join([
                f"- {item.get('userStorySummary', 'N/A')} (Priority: {item.get('priority', 'N/A')}, Effort: {item.get('effortEstimate', 0)} hours)"
                for item in user_inputs['product_backlog'].get('BacklogItems', [])
            ])

        # Include optional SOW content (trim to avoid excessive token usage)
        sow_text = (request.sow_content or "").strip()
        sow_text_trimmed = sow_text[:8000]  # cap to ~8k chars to be safe
        
        # Include current plan content for regeneration (trim to avoid excessive token usage)
        current_plan_text = (request.current_plan_content or "").strip()
        current_plan_trimmed = current_plan_text[:12000]  # cap to ~12k chars for current plan
        
        # Check if this is a regeneration request
        is_regeneration = request.regenerate_with_current_plan and current_plan_text

        # Create user inputs section
        if is_regeneration:
            print("🔄 [REGENERATION] This is a regeneration request with current plan content")
            user_inputs_text = f"""
I. Sprint Overview & Proposed Goal:
- Sprint Number: {user_inputs['sprint_overview'].get('SprintNumber', 'N/A')}
- Sprint Dates: {user_inputs['sprint_overview'].get('SprintDates', 'N/A')}
- Sprint Duration: {user_inputs['sprint_overview'].get('SprintDuration', 'N/A')}
- Team Name: {user_inputs['sprint_overview'].get('TeamName', 'N/A')}
- Sprint Goal: {user_inputs['sprint_overview'].get('SprintGoal', 'N/A')}

II. Team Capacity & Availability:
- Total Hours per Person: {user_inputs['team_capacity'].get('TotalHoursPerPerson', 'N/A')}
- Number of Members: {user_inputs['team_capacity'].get('NumberOfMembers', 'N/A')}
- Team Members: {team_members_text}
- Historical Story Points: {user_inputs['team_capacity'].get('HistoricalStoryPoints', 'N/A')}

III. Prioritized Product Backlog Items:
{backlog_items_text}

IV. Definition of Done (DoD):
{user_inputs['definition_of_done'].get('DoDContent', 'N/A')}

V. Known Impediments, Dependencies & Risks:
{user_inputs['risks_and_impediments'].get('RisksContent', 'N/A')}

VI. Statement of Work (SOW) Context (verbatim text, truncated if long):
{sow_text_trimmed if sow_text_trimmed else 'N/A'}

VII. CURRENT SPRINT PLAN (for regeneration reference):
{current_plan_trimmed if current_plan_trimmed else 'N/A'}

IMPORTANT REGENERATION INSTRUCTIONS:
- This is a REGENERATION request. Please analyze the current sprint plan above and regenerate it based on the updated SOW content.
- Maintain the same structure and format as the current plan but incorporate any changes needed based on the new SOW.
- Focus on aligning the sprint plan with the updated SOW requirements and regulations.
- Keep the same level of detail and professional formatting as the current plan.
- DO NOT include the SOW content itself in your response - use it only as context for generating the sprint plan.
"""
        else:
            print("🆕 [NEW PLAN] This is a new plan generation request")
            user_inputs_text = f"""
I. Sprint Overview & Proposed Goal:
- Sprint Number: {user_inputs['sprint_overview'].get('SprintNumber', 'N/A')}
- Sprint Dates: {user_inputs['sprint_overview'].get('SprintDates', 'N/A')}
- Sprint Duration: {user_inputs['sprint_overview'].get('SprintDuration', 'N/A')}
- Team Name: {user_inputs['sprint_overview'].get('TeamName', 'N/A')}
- Sprint Goal: {user_inputs['sprint_overview'].get('SprintGoal', 'N/A')}

II. Team Capacity & Availability:
- Total Hours per Person: {user_inputs['team_capacity'].get('TotalHoursPerPerson', 'N/A')}
- Number of Members: {user_inputs['team_capacity'].get('NumberOfMembers', 'N/A')}
- Team Members: {team_members_text}
- Historical Story Points: {user_inputs['team_capacity'].get('HistoricalStoryPoints', 'N/A')}

III. Prioritized Product Backlog Items:
{backlog_items_text}

IV. Definition of Done (DoD):
{user_inputs['definition_of_done'].get('DoDContent', 'N/A')}

V. Known Impediments, Dependencies & Risks:
{user_inputs['risks_and_impediments'].get('RisksContent', 'N/A')}

VI. Statement of Work (SOW) Context (verbatim text, truncated if long):
{sow_text_trimmed if sow_text_trimmed else 'N/A'}

IMPORTANT INSTRUCTIONS:
- Use the SOW content above as context for generating the sprint plan.
- DO NOT include the SOW content itself in your response - use it only as reference for compliance and requirements.
- Generate a clean sprint plan without repeating the SOW regulations in the output.
"""

        print(f"🔍 [GENERATE PLAN] User inputs: {user_inputs_text[:200]}...")
        
        # Call Gemini service with proper message format and higher token limit
        messages = [
            {"role": "system", "content": stored_prompt},
            {"role": "user", "content": user_inputs_text}
        ]
        
        print("🔍 [GEMINI CALL] Calling Gemini service with messages:")
        print(f"   - System message length: {len(stored_prompt)}")
        print(f"   - User message length: {len(user_inputs_text)}")
        if sow_text:
            print(f"   - SOW provided (len={len(sow_text)}), trimmed to {len(sow_text_trimmed)} chars")
        if is_regeneration:
            print(f"   - REGENERATION MODE: Current plan provided (len={len(current_plan_text)}), trimmed to {len(current_plan_trimmed)} chars")
            print(f"   - Regeneration flag: {request.regenerate_with_current_plan}")
        else:
            print(f"   - NEW PLAN MODE: No current plan content provided")

        def _truncate(text, n=800):
            try:
                return text if len(text) <= n else text[:n] + "... [truncated]"
            except Exception:
                return str(text)[:n]

        payload_preview = {
            "messages": [
                {"role": "system", "content": _truncate(stored_prompt, 600)},
                {"role": "user", "content": _truncate(user_inputs_text, 1200)}
            ],
            "max_tokens": 4000
        }
        print("===== LLM PAYLOAD (PREVIEW) =====")
        try:
            import json
            print(json.dumps(payload_preview, ensure_ascii=False, indent=2))
        except Exception:
            print(str(payload_preview))
        print("===== END LLM PAYLOAD (PREVIEW) =====")
        
        gemini_response = gemini_service.chat(messages, max_tokens=4000)
        
        print("🔍 [GEMINI CALL] Gemini service response received:")
        print(f"   - Response object: {gemini_response}")
        print(f"   - Response type: {type(gemini_response)}")
        print(f"   - Response keys: {list(gemini_response.keys()) if isinstance(gemini_response, dict) else 'Not a dict'}")
        
        # Check if Gemini service actually succeeded
        if not gemini_response:
            print("❌ [GEMINI CALL] Gemini service returned no response")
            return {"success": False, "message": "Failed to generate sprint plan from Gemini"}
        
        if not gemini_response.get('success', False):
            error_msg = gemini_response.get('response', 'Unknown error from Gemini service')
            print(f"❌ [GEMINI CALL] Gemini service failed: {error_msg}")
            return {"success": False, "message": f"Gemini service failed: {error_msg}"}
        
        if not gemini_response.get('response'):
            print("❌ [GEMINI CALL] Gemini service returned empty response")
            return {"success": False, "message": "Failed to generate sprint plan from Gemini"}
        
        if gemini_response.get("success"):
            print("🔍 [STEP 1] Initial sprint plan generation completed successfully")
            
            # Count expected Product Backlog Items from user input
            expected_pb_count = len(user_inputs['product_backlog'].get('BacklogItems', []))
            print(f"🔍 [PB COUNT] Expected Product Backlog Items: {expected_pb_count}")
            
            # STEP 2: VALIDATION AND FINE-TUNING FOR PB COMPLETENESS
            print("🔍 [STEP 2] Starting PB completeness validation and fine-tuning...")
            
            # Pre-validation check for missing sections
            original_plan = gemini_response.get("response", "")
            missing_sections = []
            
            if "Detailed Task Breakdown" not in original_plan:
                missing_sections.append("Detailed Task Breakdown")
            if "Committed Sprint Backlog" not in original_plan:
                missing_sections.append("Committed Sprint Backlog")
            if "Sprint Overview" not in original_plan:
                missing_sections.append("Sprint Overview")
            if "Team Capacity" not in original_plan:
                missing_sections.append("Team Capacity")
            
            if missing_sections:
                print(f"❌ [PRE-VALIDATION] Missing critical sections: {missing_sections}")
                print("🔄 [PRE-VALIDATION] Plan will be regenerated to include missing sections")
            else:
                print("✅ [PRE-VALIDATION] All critical sections present")
            
            validation_result = gemini_service.validate_and_finetune_sprint_plan(
                original_plan=original_plan,
                user_inputs=user_inputs_text,
                stored_prompt=stored_prompt,
                expected_pb_count=expected_pb_count
            )
            
            if validation_result.get("success"):
                if validation_result.get("improved"):
                    print(f"🔄 [VALIDATION] Plan was regenerated to include all {expected_pb_count} PBs")
                    # Use the improved plan
                    final_plan = validation_result.get("response", "")
                    gemini_response["response"] = final_plan
                else:
                    print(f"✅ [VALIDATION] Plan passed validation with all {expected_pb_count} PBs")
                    # Use the original plan
                    final_plan = gemini_response.get("response", "")
                
                print(f"🔍 [VALIDATION] Final plan length: {len(final_plan)} characters")
            else:
                print(f"⚠️ [VALIDATION] Validation failed, using original plan: {validation_result.get('validation_error', 'Unknown error')}")
                # Use original plan if validation fails
                final_plan = gemini_response.get("response", "")
            
            print("🔍 [STEP 2] PB completeness validation and fine-tuning completed")
            
            # PDF generation is now handled by frontend html2pdf.js
            
            # Transform team members to match PDF service expectations
            team_members_for_pdf = []
            if user_inputs['team_capacity'].get('TeamMembers'):
                for member in user_inputs['team_capacity'].get('TeamMembers', []):
                    team_members_for_pdf.append({
                        'name': member.get('roleName', 'N/A'),
                        'role': member.get('roleName', 'N/A'),
                        'availability': f"{member.get('workingHours', 'N/A')} hours"
                    })
            
            # Transform backlog items to match PDF service expectations
            backlog_items_for_pdf = []
            if user_inputs['product_backlog'].get('BacklogItems'):
                for item in user_inputs['product_backlog'].get('BacklogItems', []):
                    backlog_items_for_pdf.append({
                        'summary': item.get('userStorySummary', 'N/A'),
                        'priority': item.get('priority', 'N/A'),
                        'effort': f"{item.get('effortEstimate', 'N/A')} hours"
                    })
            
            # CRITICAL: Store generated plan content in a backup variable
            generated_plan_backup = gemini_response.get("response", "")
            print(f"🔍 [BACKUP] Generated plan backup created: {len(generated_plan_backup)} characters")
            print(f"🔍 [BACKUP] Generated plan backup preview: {generated_plan_backup[:200]}...")
            
            # Prepare plan data for PDF generation
            plan_data = {
                "sprint_number": user_inputs['sprint_overview'].get('SprintNumber', ''),
                "sprint_dates": user_inputs['sprint_overview'].get('SprintDates', ''),
                "sprint_duration": user_inputs['sprint_overview'].get('SprintDuration', ''),
                "team_name": user_inputs['sprint_overview'].get('TeamName', ''),
                "sprint_goal": user_inputs['sprint_overview'].get('SprintGoal', ''),
                "total_hours_per_person": user_inputs['team_capacity'].get('TotalHoursPerPerson', ''),
                "number_of_members": user_inputs['team_capacity'].get('NumberOfMembers', ''),
                "team_members": team_members_for_pdf,
                "historical_story_points": user_inputs['team_capacity'].get('HistoricalStoryPoints', ''),
                "backlog_items": backlog_items_for_pdf,
                "definition_of_done": user_inputs['definition_of_done'].get('DoDContent', ''),
                "risks_and_impediments": user_inputs['risks_and_impediments'].get('RisksContent', ''),
                "generated_plan": generated_plan_backup
            }
            
            print("🔍 [PDF GENERATION] Plan data being sent to PDF service:")
            print(f"   - Sprint Number: {plan_data.get('sprint_number')}")
            print(f"   - Team Name: {plan_data.get('team_name')}")
            print(f"   - Team Members Count: {len(plan_data.get('team_members', []))}")
            print(f"   - Backlog Items Count: {len(plan_data.get('backlog_items', []))}")
            print(f"   - Generated Plan Length: {len(plan_data.get('generated_plan', ''))}")
            print(f"   - Generated Plan Preview: {plan_data.get('generated_plan', '')[:200]}...")
            
            generated_plan_content = plan_data.get('generated_plan', '')
            if generated_plan_content:
                print(f"🔍 [GENERATED PLAN ANALYSIS] Content analysis:")
                print(f"   - Contains HTML tags: {'<h2>' in generated_plan_content or '<section>' in generated_plan_content}")
                print(f"   - Contains 'Sprint Overview': {'Sprint Overview' in generated_plan_content}")
                print(f"   - Contains 'Confirmed Sprint Goal': {'Confirmed Sprint Goal' in generated_plan_content}")
                print(f"   - Contains 'Team Capacity': {'Team Capacity' in generated_plan_content}")
                print(f"   - First 500 characters: {generated_plan_content[:500]}...")
            else:
                print("❌ [GENERATED PLAN ANALYSIS] Generated plan is empty!")
            
            
            # Add delay to ensure generated_plan is fully populated
            import time
            print("⏳ [PDF GENERATION] Waiting 3 seconds for data to settle...")
            time.sleep(3)
            
            # Double-check the generated_plan content before PDF generation
            final_generated_plan = plan_data.get('generated_plan', '')
            print(f"🔍 [PDF GENERATION] Final check - Generated plan length: {len(final_generated_plan)}")
            print(f"🔍 [PDF GENERATION] Final check - Generated plan preview: {final_generated_plan[:300]}...")
            
            if not final_generated_plan or len(final_generated_plan.strip()) < 100:
                print("❌ [PDF GENERATION] Generated plan is still empty or too short!")
                print("❌ [PDF GENERATION] Waiting additional 5 seconds...")
                time.sleep(5)
                final_generated_plan = plan_data.get('generated_plan', '')
                print(f"🔍 [PDF GENERATION] After additional wait - Length: {len(final_generated_plan)}")
            
            # Update plan_data with final content
            plan_data['generated_plan'] = final_generated_plan
            
            # CRITICAL: Ensure generated_plan is not lost
            print(f"🔍 [PDF GENERATION] CRITICAL CHECK - Before PDF generation:")
            print(f"   - Generated plan in plan_data: {len(plan_data.get('generated_plan', ''))} characters")
            print(f"   - Generated plan content preview: {plan_data.get('generated_plan', '')[:300]}...")
            print(f"   - Generated plan contains HTML: {'<h2>' in plan_data.get('generated_plan', '')}")
            
            # FINAL SAFEGUARD: If generated_plan is still empty, use backup
            if not plan_data.get('generated_plan') or len(plan_data.get('generated_plan', '').strip()) < 100:
                print("🚨 [SAFEGUARD] Generated plan is empty, using backup!")
                plan_data['generated_plan'] = generated_plan_backup
                print(f"🚨 [SAFEGUARD] Restored from backup: {len(plan_data['generated_plan'])} characters")
            
            # Generate Word document content (replica of HTML rendered output)
            print("📝 [WORD GENERATION] Generating Word document content...")
            word_document_content = generate_word_document_content(
                plan_data.get('generated_plan', ''),
                user_inputs
            )
            plan_data['word_document'] = word_document_content
            print(f"📝 [WORD GENERATION] Word document generated: {len(word_document_content)} characters")
            print(f"📝 [WORD GENERATION] Word document preview: {word_document_content[:200]}...")
            
            # Generate PDF with SprintResultsPage styling
            # pdf_result = pdf_service.generate_sprint_plan_pdf(plan_data) # This line is removed
            
            # Save to database with new structure including PDF and optional SOW content
            db_result = db_service.save_sprint_plan(db, {
                **plan_data,
                "sow_content": request.sow_content,
                # PDF generation is now handled by frontend html2pdf.js
            }, request.user_email)
            
            if db_result.get("success"):
                return {
                    "success": True,
                    "message": "Sprint plan generated and saved successfully",
                    "response": gemini_response.get("response", ""),
                    "plan_id": db_result.get("plan_id")
                }
            else:
                print(f"❌ [GENERATE PLAN] Database save failed: {db_result.get('message')}")
                return {
                    "success": False,
                                    "message": f"Failed to save sprint plan to database: {db_result.get('message')}"
            }
        else:
            return {
                "success": False,
                "message": "Failed to generate sprint plan",
                "error": gemini_response.get("error", "Unknown error")
            }
            
    except Exception as e:
        print(f"❌ [GENERATE PLAN] Error: {str(e)}")
        return {"success": False, "message": f"Error generating sprint plan: {str(e)}"}

# LLM and Gemini endpoints
@app.post("/api/llm/chat", response_model=LLMChatResponse)
async def llm_chat(request: LLMChatRequest):
    """Mock LLM chat endpoint"""
    return llm_service.chat(request)



@app.post("/api/gemini/chat")
async def gemini_chat(request: dict):
    """Gemini chat endpoint"""
    from services.gemini_service import gemini_service
    return gemini_service.chat(request.get("messages", []), request.get("max_tokens", 3000))

# CSV Sprint Plans endpoints
@app.get("/api/sprint-plans")
async def get_sprint_plans(user_email: str = None, db: Session = Depends(get_db)):
    """Get sprint plans from database"""
    try:
        from services.db_service import db_service
        
        # If user_email is provided, filter by user
        if user_email:
            return db_service.get_sprint_plans_by_user(db, user_email)
        else:
            # Return all plans (for admin purposes)
            return db_service.get_all_sprint_plans(db)
    except Exception as e:
        return {"success": False, "message": str(e)}

@app.get("/api/sprint-plans/{plan_id}")
async def get_sprint_plan(plan_id: int, db: Session = Depends(get_db)):
    """Get a specific sprint plan by ID"""
    return db_service.get_sprint_plan_by_id(db, plan_id)

@app.delete("/api/sprint-plans/{plan_id}")
async def delete_sprint_plan(plan_id: int, user_email: str, db: Session = Depends(get_db)):
    """Delete a sprint plan (only if user owns it)"""
    return db_service.delete_sprint_plan(db, plan_id, user_email)

@app.put("/api/sprint-plans/{plan_id}/edit")
async def edit_sprint_plan(plan_id: int, request: EditSprintPlanRequest, db: Session = Depends(get_db)):
    """Edit an existing sprint plan and create a new version"""
    # Format the data for the database service
    updated_data = {
        'sprint_number': request.sprint_overview.get('SprintNumber', ''),
        'sprint_dates': request.sprint_overview.get('SprintDates', ''),
        'sprint_duration': request.sprint_overview.get('SprintDuration', ''),
        'team_name': request.sprint_overview.get('TeamName', ''),
        'sprint_goal': request.sprint_overview.get('SprintGoal', ''),
        
        'total_hours_per_person': request.team_capacity.get('TotalHoursPerPerson', ''),
        'number_of_members': request.team_capacity.get('NumberofMembers', ''),
        'team_members': request.team_capacity.get('TeamMembers', []),
        'historical_story_points': request.team_capacity.get('HistoricalStoryPoints', ''),
        
        'backlog_items': request.product_backlog.get('BacklogItems', []),
        'definition_of_done': request.definition_of_done.get('DefinitionOfDone', ''),
        'risks_and_impediments': request.risks_and_impediments.get('RisksAndImpediments', '')
    }
    
    return db_service.edit_sprint_plan(db, plan_id, updated_data, request.edit_comments, request.edited_by)

@app.get("/api/sprint-plans/{plan_id}/versions")
async def get_plan_versions(plan_id: int, db: Session = Depends(get_db)):
    """Get all versions of a specific sprint plan"""
    return db_service.get_plan_versions(db, plan_id)

# PDF download endpoint removed - PDF generation now handled by frontend html2pdf.js

@app.post("/api/sprint-plans/{plan_id}/download-version")
async def download_plan_version(plan_id: int, request: DownloadVersionRequest, db: Session = Depends(get_db)):
    """Get a specific version of a sprint plan for download"""
    versions_result = db_service.get_plan_versions(db, plan_id)
    if not versions_result.get("success"):
        return versions_result
    
    # Find the requested version
    requested_version = None
    for version in versions_result.get("versions", []):
        if version.get("version_number") == request.version_number:
            requested_version = version
            break
    
    if not requested_version:
        return {"success": False, "message": f"Version {request.version_number} not found"}
    
    return {"success": True, "version": requested_version}

@app.post("/api/sprint/edit-plan")
async def edit_sprint_plan(request: EditSprintPlanRequest, db: Session = Depends(get_db)):
    """Edit and regenerate a sprint plan based on new requirements"""
    try:
        print("=" * 80)
        print("✏️ [EDIT SPRINT PLAN] REQUEST RECEIVED")
        print("=" * 80)
        print(f"📝 [EDIT PLAN] Edit Comments: {request.edit_comments}")
        print(f"👤 [EDIT PLAN] Edited By: {request.edited_by}")
        print("=" * 80)
        
        from services.gemini_service import gemini_service
        from services.db_service import db_service
        
        # Get stored prompt from global variable or fetch from DB
        stored_prompt = get_global_prompt_data()
        if not stored_prompt:
            # Fallback: fetch from database
            print("🔍 [EDIT PLAN] Global prompt is None, fetching from database...")
            result = db.execute(text("SELECT id, prompt, feature FROM documents WHERE feature = 'SprintPlan' LIMIT 1"))
            row = result.fetchone()
            if row:
                stored_prompt = row[1]
                # Update global variable for future use
                global GLOBAL_PROMPT_DATA
                GLOBAL_PROMPT_DATA = stored_prompt
                print(f"🔍 [EDIT PLAN] Loaded prompt from database: {len(stored_prompt)} characters")
            else:
                print("❌ [EDIT PLAN] No prompt found in database!")
                return {"success": False, "message": "No prompt found in database"}
        
        # Create enhanced prompt with edit requirements
        enhanced_prompt = f"""
{stored_prompt}

IMPORTANT EDIT REQUIREMENTS:
The user has requested the following changes to the previously generated sprint plan:

"{request.edit_comments}"

Please regenerate the sprint plan incorporating these specific requirements. 
Make sure the new plan addresses all the user's edit requests while maintaining 
the professional structure and format of the original plan.

User Inputs for Sprint Plan:
"""
        
        # Format user inputs into prompt template
        user_inputs = {
            "sprint_overview": request.sprint_overview,
            "team_capacity": request.team_capacity,
            "product_backlog": request.product_backlog,
            "definition_of_done": request.definition_of_done,
            "risks_and_impediments": request.risks_and_impediments,
            "additional_comments": request.additional_comments
        }
        
        # Format team members and backlog items
        team_members_text = ""
        if user_inputs['team_capacity'].get('TeamMembers'):
            team_members_text = "\n".join([
                f"- {member.get('roleName', 'N/A')}: {member.get('workingHours', 'N/A')}"
                for member in user_inputs['team_capacity'].get('TeamMembers', [])
            ])

        backlog_items_text = ""
        if user_inputs['product_backlog'].get('BacklogItems'):
            backlog_items_text = "\n".join([
                f"- {item.get('userStorySummary', 'N/A')} (Priority: {item.get('priority', 'N/A')}, Effort: {item.get('effortEstimate', 0)} hours)"
                for item in user_inputs['product_backlog'].get('BacklogItems', [])
            ])

        # Build the complete prompt
        complete_prompt = f"""
{enhanced_prompt}

SPRINT OVERVIEW:
- Sprint Number: {user_inputs['sprint_overview'].get('SprintNumber', 'N/A')}
- Sprint Dates: {user_inputs['sprint_overview'].get('SprintDates', 'N/A')}
- Team Name: {user_inputs['sprint_overview'].get('TeamName', 'N/A')}
- Sprint Goal: {user_inputs['sprint_overview'].get('SprintGoal', 'N/A')}

TEAM CAPACITY:
- Total Hours per Person: {user_inputs['team_capacity'].get('TotalHoursPerPerson', 'N/A')}
- Number of Members: {user_inputs['team_capacity'].get('NumberOfMembers', 'N/A')}
- Historical Story Points: {user_inputs['team_capacity'].get('HistoricalStoryPoints', 'N/A')}
- Team Members:
{team_members_text if team_members_text else '  - No team members specified'}

PRODUCT BACKLOG ITEMS:
{backlog_items_text if backlog_items_text else '- No backlog items specified'}

DEFINITION OF DONE:
{user_inputs['definition_of_done'].get('DoDContent', 'N/A')}

RISKS & IMPEDIMENTS:
{user_inputs['risks_and_impediments'].get('RisksContent', 'N/A')}

ADDITIONAL COMMENTS:
{user_inputs['additional_comments'].get('CommentsContent', 'N/A')}

Remember to incorporate the edit requirements: "{request.edit_comments}"
"""
        
        print(f"🔍 [EDIT PLAN] Enhanced prompt length: {len(complete_prompt)} characters")
        print(f"🔍 [EDIT PLAN] Prompt preview: {complete_prompt[:300]}...")
        
        # Generate new plan using LLM service - use the EXACT same format as main plan generation
        messages = [
            {"role": "system", "content": stored_prompt},           # Base prompt from documents table
            {"role": "user", "content": complete_prompt}            # User inputs + edit requirements
        ]
        
        print("🚀 [EDIT PLAN] Calling LLM service to regenerate plan...")
        llm_response = gemini_service.chat(messages, max_tokens=4000)
        
        # Check if LLM service actually succeeded
        if not llm_response:
            print("❌ [EDIT PLAN] LLM service returned no response")
            return {"success": False, "message": "Failed to generate new plan from LLM"}
        
        if not llm_response.get('success', False):
            error_msg = llm_response.get('response', 'Unknown error from LLM service')
            print(f"❌ [EDIT PLAN] LLM service failed: {error_msg}")
            return {"success": False, "message": f"LLM service failed: {error_msg}"}
        
        if not llm_response.get('response'):
            print("❌ [EDIT PLAN] LLM service returned empty response")
            return {"success": False, "message": "Failed to generate new plan from LLM"}
        
        new_generated_plan = llm_response['response']
        print(f"✅ [EDIT PLAN] New plan generated successfully, length: {len(new_generated_plan)} characters")
        
        # Count expected Product Backlog Items from user input
        expected_pb_count = len(user_inputs['product_backlog'].get('BacklogItems', []))
        print(f"🔍 [EDIT PB COUNT] Expected Product Backlog Items: {expected_pb_count}")
        
        # STEP 2: VALIDATION AND FINE-TUNING FOR EDITED PLAN PB COMPLETENESS
        print("🔍 [EDIT VALIDATION] Starting PB completeness validation for edited plan...")
        
        # Pre-validation check for missing sections in edited plan
        missing_sections = []
        
        if "Detailed Task Breakdown" not in new_generated_plan:
            missing_sections.append("Detailed Task Breakdown")
        if "Committed Sprint Backlog" not in new_generated_plan:
            missing_sections.append("Committed Sprint Backlog")
        if "Sprint Overview" not in new_generated_plan:
            missing_sections.append("Sprint Overview")
        if "Team Capacity" not in new_generated_plan:
            missing_sections.append("Team Capacity")
        
        if missing_sections:
            print(f"❌ [EDIT PRE-VALIDATION] Missing critical sections: {missing_sections}")
            print("🔄 [EDIT PRE-VALIDATION] Edited plan will be regenerated to include missing sections")
        else:
            print("✅ [EDIT PRE-VALIDATION] All critical sections present")
        
        # Create user inputs text for validation
        user_inputs_text = f"""
I. Sprint Overview & Proposed Goal:
- Sprint Number: {user_inputs['sprint_overview'].get('SprintNumber', 'N/A')}
- Sprint Dates: {user_inputs['sprint_overview'].get('SprintDates', 'N/A')}
- Sprint Duration: {user_inputs['sprint_overview'].get('SprintDuration', 'N/A')}
- Team Name: {user_inputs['sprint_overview'].get('TeamName', 'N/A')}
- Sprint Goal: {user_inputs['sprint_overview'].get('SprintGoal', 'N/A')}

II. Team Capacity & Availability:
- Total Hours per Person: {user_inputs['team_capacity'].get('TotalHoursPerPerson', 'N/A')}
- Number of Members: {user_inputs['team_capacity'].get('NumberOfMembers', 'N/A')}
- Team Members: {team_members_text}
- Historical Story Points: {user_inputs['team_capacity'].get('HistoricalStoryPoints', 'N/A')}

III. Prioritized Product Backlog Items:
{backlog_items_text}

IV. Definition of Done (DoD):
{user_inputs['definition_of_done'].get('DoDContent', 'N/A')}

V. Known Impediments, Dependencies & Risks:
{user_inputs['risks_and_impediments'].get('RisksContent', 'N/A')}

VI. Additional Comments:
{user_inputs['additional_comments'].get('CommentsContent', 'N/A')}
"""
        
        validation_result = gemini_service.validate_and_finetune_sprint_plan(
            original_plan=new_generated_plan,
            user_inputs=user_inputs_text,
            stored_prompt=stored_prompt,
            expected_pb_count=expected_pb_count
        )
        
        if validation_result.get("success"):
            if validation_result.get("improved"):
                print(f"🔄 [EDIT VALIDATION] Edited plan was regenerated to include all {expected_pb_count} PBs")
                new_generated_plan = validation_result.get("response", "")
            else:
                print(f"✅ [EDIT VALIDATION] Edited plan passed validation with all {expected_pb_count} PBs")
            
            print(f"🔍 [EDIT VALIDATION] Final edited plan length: {len(new_generated_plan)} characters")
        else:
            print(f"⚠️ [EDIT VALIDATION] Validation failed, using original edited plan: {validation_result.get('validation_error', 'Unknown error')}")
        
        print("🔍 [EDIT VALIDATION] PB completeness validation completed")
        
        # Generate Word document content for the new plan
        print("📝 [EDIT PLAN] Generating Word document content for new plan...")
        word_document_content = generate_word_document_content(new_generated_plan, user_inputs)
        print(f"📝 [EDIT PLAN] Word document generated: {len(word_document_content)} characters")
        
        # Prepare data for saving new plan
        plan_data = {
            'sprint_number': user_inputs['sprint_overview'].get('SprintNumber'),
            'sprint_dates': user_inputs['sprint_overview'].get('SprintDates'),
            'sprint_duration': user_inputs['sprint_overview'].get('SprintDuration'),
            'team_name': user_inputs['sprint_overview'].get('TeamName'),
            'sprint_goal': user_inputs['sprint_overview'].get('SprintGoal'),
            'total_hours_per_person': user_inputs['team_capacity'].get('TotalHoursPerPerson'),
            'number_of_members': user_inputs['team_capacity'].get('NumberOfMembers'),
            'team_members': user_inputs['team_capacity'].get('TeamMembers'),
            'historical_story_points': user_inputs['team_capacity'].get('HistoricalStoryPoints'),
            'backlog_items': user_inputs['product_backlog'].get('BacklogItems'),
            'definition_of_done': user_inputs['definition_of_done'].get('DoDContent'),
            'risks_and_impediments': user_inputs['risks_and_impediments'].get('RisksContent'),
            'generated_plan': new_generated_plan,
            'word_document': word_document_content,
            'user_email': request.edited_by
        }
        
        # First, delete old plans with same sprint number and team name
        print("🗑️ [EDIT PLAN] Replacing old plans...")
        replace_result = db_service.find_and_delete_old_plan(
            db, 
            request.edited_by, 
            plan_data['sprint_number'], 
            plan_data['team_name']
        )
        
        if not replace_result['success']:
            print(f"⚠️ [EDIT PLAN] Warning: Could not replace old plans: {replace_result['message']}")
        else:
            print(f"✅ [EDIT PLAN] {replace_result['message']}")
        
        # Save new plan to database
        print("💾 [EDIT PLAN] Saving new plan to database...")
        save_result = db_service.save_sprint_plan(db, plan_data, request.edited_by)
        
        if not save_result['success']:
            print(f"❌ [EDIT PLAN] Failed to save new plan: {save_result['message']}")
            return {"success": False, "message": f"Failed to save new plan: {save_result['message']}"}
        
        print(f"✅ [EDIT PLAN] New plan saved successfully with ID: {save_result['plan_id']}")
        
        # Return the new plan data in the format expected by frontend
        return {
            "success": True,
            "message": "Sprint plan edited and regenerated successfully",
            "plan": {
                "id": save_result['plan_id'],
                "response": new_generated_plan,
                "summary": new_generated_plan,
                "sprint_number": plan_data['sprint_number'],
                "sprint_dates": plan_data['sprint_dates'],
                "team_name": plan_data['team_name']
            }
        }
        
    except Exception as e:
        print(f"❌ [EDIT PLAN] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"success": False, "message": f"Error editing sprint plan: {str(e)}"}

# Risk Assessment endpoints
@app.post("/api/risk-assessment/start", response_model=RiskAssessmentStartResponse)
async def start_risk_assessment(
    request: RiskAssessmentStartRequest,
    db: Session = Depends(get_db)
):
    """Start a new risk assessment session"""
    return risk_service.start_risk_assessment(request, db)

@app.get("/api/risk-assessments")
async def get_risk_assessments(user_email: str = None, db: Session = Depends(get_db)):
    """Get risk assessments from database"""
    try:
        from services.db_service import db_service
        
        # If user_email is provided, filter by user
        if user_email:
            return db_service.get_risk_assessments_by_user(db, user_email)
        else:
            # Return all assessments (for admin purposes)
            return db_service.get_all_risk_assessments(db)
    except Exception as e:
        return {"success": False, "message": str(e)}

@app.get("/api/risk-assessments/{assessment_id}")
async def get_risk_assessment(assessment_id: int, db: Session = Depends(get_db)):
    """Get a specific risk assessment by ID"""
    return db_service.get_risk_assessment_by_id(db, assessment_id)

@app.delete("/api/risk-assessments/{assessment_id}")
async def delete_risk_assessment(assessment_id: int, user_email: str, db: Session = Depends(get_db)):
    """Delete a risk assessment (only if user owns it)"""
    return db_service.delete_risk_assessment(db, assessment_id, user_email)

@app.post("/api/risk-assessment/chat", response_model=RiskAssessmentChatResponse)
async def chat_with_llm_risk(
    request: RiskAssessmentChatRequest,
    db: Session = Depends(get_db)
):
    """Send message to LLM and get response for risk assessment"""
    # Fetch RiskAssessment prompt from database
    result = db.execute(text("SELECT id, prompt, feature FROM documents WHERE feature = 'RiskAssessment' LIMIT 1"))
    row = result.fetchone()
    if row:
        risk_prompt = row[1]
        print(f"🔍 [RISK CHAT] Loaded RiskAssessment prompt from database: {len(risk_prompt)} characters")
    else:
        print("❌ [RISK CHAT] No RiskAssessment prompt found in database!")
        return {"success": False, "message": "No RiskAssessment prompt found in database"}
    
    return risk_service.chat_with_llm(request, db, risk_prompt)

@app.post("/api/risk-assessment/finish", response_model=RiskAssessmentFinishResponse)
async def finish_risk_assessment(
    request: RiskAssessmentFinishRequest,
    db: Session = Depends(get_db)
):
    """Complete risk assessment and get summary"""
    return risk_service.finish_risk_assessment(request, db)

@app.post("/api/risk-assessment/generate-assessment")
async def generate_risk_assessment(request: GenerateRiskAssessmentRequest, db: Session = Depends(get_db)):
    """Generate risk assessment with new structure"""
    try:
        import json
        
        # Log the complete JSON request data
        print("=" * 80)
        print("🚀 [GENERATE RISK ASSESSMENT] REQUEST RECEIVED")
        print("=" * 80)
        print("📋 [GENERATE RISK ASSESSMENT] Complete JSON Request Data:")
        print("=" * 80)
        
        # Convert request to dict for logging
        request_dict = {
            "project_overview": request.project_overview,
            "risk_categories": request.risk_categories,
            "stakeholders": request.stakeholders,
            "risk_matrix": request.risk_matrix,
            "risk_register": request.risk_register,
            "additional_comments": request.additional_comments,
            "all_risks_data": request.all_risks_data
        }
        
        # Pretty print the JSON
        print(json.dumps(request_dict, indent=2, ensure_ascii=False))
        print("=" * 80)
        
        from services.gemini_service import gemini_service
        from services.db_service import db_service
        
        # Get stored prompt from global variable or fetch from DB
        stored_prompt = get_global_prompt_data()
        if not stored_prompt:
            # Fallback: fetch from database
            print("🔍 [PROMPT LOADING] Global prompt is None, fetching from database...")
            result = db.execute(text("SELECT id, prompt, feature FROM documents WHERE feature = 'RiskAssessment' LIMIT 1"))
            row = result.fetchone()
            if row:
                stored_prompt = row[1]
                # Update global variable for future use
                global GLOBAL_PROMPT_DATA
                GLOBAL_PROMPT_DATA = stored_prompt
                print(f"🔍 [PROMPT LOADING] Loaded prompt from database: {len(stored_prompt)} characters")
            else:
                print("❌ [PROMPT LOADING] No prompt found in database!")
                return {"success": False, "message": "No prompt found in database"}
        else:
            print(f"🔍 [PROMPT LOADING] Using global prompt: {len(stored_prompt)} characters")
        
        # Fetch RiskAssessment prompt from database
        print("🔍 [PROMPT LOADING] Fetching RiskAssessment prompt from database...")
        result = db.execute(text("SELECT id, prompt, feature FROM documents WHERE feature = 'RiskAssessment' LIMIT 1"))
        row = result.fetchone()
        if row:
            stored_prompt = row[1]
            print(f"🔍 [PROMPT LOADING] Loaded RiskAssessment prompt from database: {len(stored_prompt)} characters")
        else:
            print("❌ [PROMPT LOADING] No RiskAssessment prompt found in database!")
            return {"success": False, "message": "No RiskAssessment prompt found in database"}
        
        print(f"🔍 [GENERATE ASSESSMENT] Final prompt length: {len(stored_prompt)} characters")
        print(f"🔍 [GENERATE ASSESSMENT] Prompt preview: {stored_prompt[:200]}...")
        
        # Validate that we have a proper prompt
        if not stored_prompt or len(stored_prompt.strip()) < 50:
            print("❌ [PROMPT VALIDATION] Prompt is too short or empty!")
            return {"success": False, "message": "Invalid prompt data. Please ensure prompt is properly loaded."}
        
        # Prepare user inputs as JSON for the database prompt to handle
        user_inputs = {
            "project_overview": request.project_overview,
            "risk_categories": request.risk_categories,
            "stakeholders": request.stakeholders,
            "risk_matrix": request.risk_matrix,
            "risk_register": request.risk_register,
            "additional_comments": request.additional_comments,
            "all_risks_data": request.all_risks_data  # Include the all_risks_data field
        }
        
        # Convert user inputs to JSON string for the prompt
        import json
        user_inputs_json = json.dumps(user_inputs, indent=2, ensure_ascii=False)
        
        print(f"🔍 [GENERATE ASSESSMENT] User inputs JSON length: {len(user_inputs_json)}")
        print(f"🔍 [GENERATE ASSESSMENT] User inputs JSON: {user_inputs_json}")
        
        # Call Gemini service with database prompt handling the formatting
        messages = [
            {"role": "system", "content": stored_prompt},
            {"role": "user", "content": f"Please generate a comprehensive risk assessment based on the following project data:\n\n{user_inputs_json}"}
        ]
        
        print(f"🔍 [GENERATE ASSESSMENT] Messages being sent to Gemini:")
        print(f"   - System message length: {len(stored_prompt)}")
        print(f"   - User message length: {len(messages[1]['content'])}")
        print(f"   - User message content: {messages[1]['content'][:200]}...")
        
        print("🔍 [GEMINI CALL] Calling Gemini service with messages:")
        print(f"   - System message length: {len(stored_prompt)}")
        print(f"   - User message length: {len(messages[1]['content'])}")
        
        gemini_response = gemini_service.chat(messages, max_tokens=4000)
        
        print("🔍 [GEMINI CALL] Gemini service response received:")
        print(f"   - Response object: {gemini_response}")
        print(f"   - Response type: {type(gemini_response)}")
        print(f"   - Response keys: {list(gemini_response.keys()) if isinstance(gemini_response, dict) else 'Not a dict'}")
        
        # Check if Gemini service actually succeeded
        if not gemini_response:
            print("❌ [GEMINI CALL] Gemini service returned no response")
            return {"success": False, "message": "Failed to generate risk assessment from Gemini"}
        
        if not gemini_response.get('success', False):
            error_msg = gemini_response.get('response', 'Unknown error from Gemini service')
            print(f"❌ [GEMINI CALL] Gemini service failed: {error_msg}")
            return {"success": False, "message": f"Gemini service failed: {error_msg}"}
        
        if not gemini_response.get('response'):
            print("❌ [GEMINI CALL] Gemini service returned empty response")
            return {"success": False, "message": "Failed to generate risk assessment from Gemini"}
        
        if gemini_response.get("success"):
            print("🔍 [STEP 1] Initial risk assessment generation completed successfully")
            
            # Count expected risks from user input
            expected_risk_count = len(user_inputs.get('all_risks_data', []))
            print(f"🔍 [RISK COUNT] Expected risks: {expected_risk_count}")
            
            # STEP 2: VALIDATION AND FINE-TUNING FOR RISK COMPLETENESS
            print("🔍 [STEP 2] Starting risk completeness validation and fine-tuning...")
            
            # Pre-validation check for risk count
            original_assessment = gemini_response.get("response", "")
            
            # Count risks in the original assessment
            risk_count_in_output = original_assessment.count("**Risk ID:**")
            print(f"🔍 [PRE-VALIDATION] Risks found in output: {risk_count_in_output}")
            print(f"🔍 [PRE-VALIDATION] Expected risks: {expected_risk_count}")
            
            if risk_count_in_output < expected_risk_count:
                print(f"❌ [PRE-VALIDATION] Missing risks: {expected_risk_count - risk_count_in_output}")
                print("🔄 [PRE-VALIDATION] Assessment will be regenerated to include all risks")
            else:
                print("✅ [PRE-VALIDATION] All risks present")
            
            # Create user inputs text for validation
            user_inputs_text = f"""
PROJECT OVERVIEW:
- Project Name: {user_inputs['project_overview'].get('ProjectName', 'N/A')}
- Project Dates: {user_inputs['project_overview'].get('ProjectDates', 'N/A')}
- Project Duration: {user_inputs['project_overview'].get('ProjectDuration', 'N/A')}
- Team Name: {user_inputs['project_overview'].get('TeamName', 'N/A')}
- Project Scope: {user_inputs['project_overview'].get('ProjectScope', 'N/A')}

RISK CATEGORIES:
{user_inputs['risk_categories'].get('RiskCategories', [])}

STAKEHOLDERS:
{user_inputs['stakeholders'].get('Stakeholders', [])}

RISK MATRIX:
{user_inputs['risk_matrix'].get('RiskMatrixContent', 'N/A')}

RISK REGISTER:
{user_inputs['risk_register'].get('RiskRegisterContent', 'N/A')}

ALL RISKS DATA:
{user_inputs.get('all_risks_data', [])}

ADDITIONAL COMMENTS:
{user_inputs['additional_comments'].get('CommentsContent', 'N/A')}
"""
            
            validation_result = gemini_service.validate_and_finetune_risk_assessment(
                original_assessment=original_assessment,
                user_inputs=user_inputs_text,
                stored_prompt=stored_prompt,
                expected_risk_count=expected_risk_count
            )
            
            if validation_result.get("success"):
                print("✅ [STEP 2] Risk assessment validation completed successfully")
                final_assessment = validation_result.get("response", original_assessment)
            else:
                print(f"⚠️ [STEP 2] Validation failed, using original assessment: {validation_result.get('error', 'Unknown error')}")
                final_assessment = original_assessment
            
            # CRITICAL: Store final validated assessment content
            generated_assessment_backup = final_assessment
            
            # Clean up any unwanted markdown tags
            import re
            generated_assessment_backup = re.sub(r'```html\s*', '', generated_assessment_backup, flags=re.IGNORECASE)
            generated_assessment_backup = re.sub(r'```\s*$', '', generated_assessment_backup, flags=re.IGNORECASE)
            generated_assessment_backup = generated_assessment_backup.strip()
            
            print(f"🔍 [FINAL ASSESSMENT] Final validated assessment created: {len(generated_assessment_backup)} characters")
            print(f"🔍 [FINAL ASSESSMENT] Final assessment preview: {generated_assessment_backup[:200]}...")
            
            # Prepare assessment data for saving
            assessment_data = {
                "project_name": user_inputs['project_overview'].get('ProjectName', ''),
                "project_dates": user_inputs['project_overview'].get('ProjectDates', ''),
                "project_duration": user_inputs['project_overview'].get('ProjectDuration', ''),
                "team_name": user_inputs['project_overview'].get('TeamName', ''),
                "project_scope": user_inputs['project_overview'].get('ProjectScope', ''),
                "risk_categories": user_inputs['risk_categories'].get('RiskCategories', []),
                "risk_mitigation": user_inputs['risk_categories'].get('RiskMitigation', ''),
                "risk_monitoring": user_inputs['risk_categories'].get('RiskMonitoring', ''),
                "stakeholders": user_inputs['stakeholders'].get('Stakeholders', []),
                "risk_matrix": user_inputs['risk_matrix'].get('RiskMatrixData', {}),
                "risk_register": user_inputs['risk_register'].get('RiskRegisterData', {}),
                "generated_assessment": generated_assessment_backup,
                "word_document": generated_assessment_backup  # For now, use the same content
            }
            
            # Generate Word document content (replica of HTML rendered output)
            print("📝 [WORD GENERATION] Generating Word document content...")
            word_document_content = generate_risk_assessment_word_document(
                assessment_data.get('generated_assessment', ''),
                user_inputs
            )
            assessment_data['word_document'] = word_document_content
            print(f"📝 [WORD GENERATION] Word document generated: {len(word_document_content)} characters")
            
            # Save to database with new structure
            db_result = db_service.save_risk_assessment(db, assessment_data, request.user_email)
            
            if db_result.get("success"):
                return {
                    "success": True,
                    "message": "Risk assessment generated, validated, and saved successfully",
                    "response": final_assessment,  # Use the validated assessment
                    "assessment_id": db_result.get("assessment_id")
                }
            else:
                print(f"❌ [GENERATE ASSESSMENT] Database save failed: {db_result.get('message')}")
                return {
                    "success": False,
                    "message": f"Failed to save risk assessment to database: {db_result.get('message')}"
                }
        else:
            return {
                "success": False,
                "message": "Failed to generate risk assessment",
                "error": gemini_response.get("error", "Unknown error")
            }
            
    except Exception as e:
        print(f"❌ [GENERATE ASSESSMENT] Error: {str(e)}")
        return {"success": False, "message": f"Error generating risk assessment: {str(e)}"}

def generate_risk_assessment_word_document(generated_assessment: str, user_inputs: dict) -> str:
    """Generate Word document content that is a replica of HTML rendered output for risk assessment"""
    try:
        # Remove markdown code blocks but keep HTML formatting
        html_content = generated_assessment or ''
        import re
        html_content = re.sub(r'```html\s*', '', html_content, flags=re.IGNORECASE)
        html_content = re.sub(r'```\s*$', '', html_content, flags=re.IGNORECASE)
        html_content = html_content.strip()
        
        # If the content doesn't start with <!DOCTYPE or <html, wrap it properly
        if not html_content.startswith('<!DOCTYPE') and not html_content.startswith('<html'):
            html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Risk Assessment - {user_inputs.get('project_overview', {}).get('ProjectName', 'N/A')}</title>
</head>
<body>
{html_content}
</body>
</html>"""
        
        if not html_content:
            return '<p>No content available for Word document.</p>'
        
        # Create Word-compatible HTML with all formatting preserved
        word_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Risk Assessment - {user_inputs.get('project_overview', {}).get('ProjectName', 'N/A')}</title>
            <style>
                body {{
                    font-family: 'Calibri', 'Arial', sans-serif;
                    margin: 20px;
                    padding: 0;
                    background: white;
                    color: #2c3e50;
                    line-height: 1.6;
                    font-size: 11pt;
                }}
                h1, h2, h3, h4 {{
                    color: #2d3748;
                    margin: 20px 0 15px 0;
                    font-weight: 600;
                }}
                h1 {{ font-size: 18pt; }}
                h2 {{ font-size: 16pt; }}
                h3 {{ font-size: 14pt; }}
                h4 {{ font-size: 12pt; }}
                p {{ margin: 10px 0; }}
                table {{
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                    border: 1px solid #ddd;
                }}
                th, td {{
                    border: 1px solid #ddd;
                    padding: 8px 12px;
                    text-align: left;
                    vertical-align: top;
                }}
                th {{
                    background-color: #f8f9fa;
                    font-weight: bold;
                    color: #2d3748;
                }}
                ul, ol {{ 
                    margin: 15px 0; 
                    padding-left: 30px; 
                }}
                li {{ 
                    margin: 8px 0; 
                    line-height: 1.6;
                }}
                strong {{
                    color: #2d3748;
                    font-weight: 600;
                }}
                em {{
                    color: #718096;
                    font-style: italic;
                }}
                .assessment-header {{
                    background: #f7fafc;
                    border: 2px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 20px;
                    text-align: center;
                }}
                .assessment-header h1 {{
                    margin: 0 0 10px 0;
                    color: #1a202c;
                }}
                .assessment-header p {{
                    margin: 0;
                    color: #4a5568;
                    font-size: 12pt;
                }}
            </style>
        </head>
        <body>
            <div class="assessment-header">
                <h1>Risk Assessment - {user_inputs.get('project_overview', {}).get('ProjectName', 'N/A')}</h1>
                <p>Generated on {__import__('datetime').datetime.now().strftime('%Y-%m-%d')}</p>
            </div>
            
            {html_content}
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #718096; font-size: 10pt;">
                <p>This risk assessment was automatically generated by the Risk Assessment System</p>
                <p>Document ID: RA-{user_inputs.get('project_overview', {}).get('ProjectName', 'N/A')}-{__import__('datetime').datetime.now().strftime('%Y-%m-%d')}</p>
            </div>
        </body>
        </html>
        """
        
        return word_html.strip()
        
    except Exception as e:
        print(f"❌ [WORD GENERATION] Error generating Word document: {str(e)}")
        return f'<p>Error generating Word document: {str(e)}</p>'

# Risk Assessment CRUD endpoints
@app.get("/api/risk-assessments")
async def get_risk_assessments(user_email: str = None, db: Session = Depends(get_db)):
    """Get risk assessments from database"""
    try:
        from services.db_service import db_service
        
        # If user_email is provided, filter by user
        if user_email:
            return db_service.get_risk_assessments_by_user(db, user_email)
        else:
            # Return all assessments (for admin purposes)
            return db_service.get_all_risk_assessments(db)
    except Exception as e:
        return {"success": False, "message": str(e)}

@app.get("/api/risk-assessments/{assessment_id}")
async def get_risk_assessment(assessment_id: int, db: Session = Depends(get_db)):
    """Get a specific risk assessment by ID"""
    return db_service.get_risk_assessment_by_id(db, assessment_id)

@app.delete("/api/risk-assessments/{assessment_id}")
async def delete_risk_assessment(assessment_id: int, user_email: str, db: Session = Depends(get_db)):
    """Delete a risk assessment (only if user owns it)"""
    return db_service.delete_risk_assessment(db, assessment_id, user_email)

# Feedback endpoints
@app.post("/api/feedback", response_model=FeedbackResponse)
async def submit_feedback(feedback_data: FeedbackRequest, db: Session = Depends(get_db)):
    """Submit feedback form data"""
    try:
        print(f"📝 [FEEDBACK] Received feedback submission")
        print(f"📝 [FEEDBACK] Data: {feedback_data.dict()}")
        
        # Create new feedback record
        feedback = Feedback(
            name=feedback_data.name,
            email=feedback_data.email,
            clarity_of_sprint_goals=feedback_data.clarity_of_sprint_goals,
            workload_distribution=feedback_data.workload_distribution,
            plan_alignment_sow=feedback_data.plan_alignment_sow,
            suggestions_sprint_planning=feedback_data.suggestions_sprint_planning,
            risks_clear=feedback_data.risks_clear,
            mitigation_practical=feedback_data.mitigation_practical,
            suggestions_risk_assessment=feedback_data.suggestions_risk_assessment,
            overall_sprint_planning_rating=feedback_data.overall_sprint_planning_rating,
            overall_risk_assessment_rating=feedback_data.overall_risk_assessment_rating,
            additional_comments=feedback_data.additional_comments,
            created_by=feedback_data.user_email or feedback_data.email
        )
        
        # Add to database
        db.add(feedback)
        db.commit()
        db.refresh(feedback)
        
        print(f"✅ [FEEDBACK] Successfully saved feedback with ID: {feedback.id}")
        
        return FeedbackResponse(
            success=True,
            message="Feedback submitted successfully!",
            feedback_id=feedback.id
        )
        
    except Exception as e:
        print(f"❌ [FEEDBACK] Error submitting feedback: {str(e)}")
        db.rollback()
        return FeedbackResponse(
            success=False,
            message=f"Error submitting feedback: {str(e)}"
        )

@app.get("/api/feedback")
async def get_feedback(user_email: str = None, db: Session = Depends(get_db)):
    """Get feedback submissions (admin or user-specific)"""
    try:
        if user_email:
            # Get feedback for specific user
            feedback = db.query(Feedback).filter(Feedback.created_by == user_email).all()
        else:
            # Get all feedback (admin)
            feedback = db.query(Feedback).all()
        
        return {
            "success": True,
            "feedback": [
                {
                    "id": f.id,
                    "name": f.name,
                    "email": f.email,
                    "clarity_of_sprint_goals": f.clarity_of_sprint_goals,
                    "workload_distribution": f.workload_distribution,
                    "plan_alignment_sow": f.plan_alignment_sow,
                    "suggestions_sprint_planning": f.suggestions_sprint_planning,
                    "risks_clear": f.risks_clear,
                    "mitigation_practical": f.mitigation_practical,
                    "suggestions_risk_assessment": f.suggestions_risk_assessment,
                    "overall_sprint_planning_rating": f.overall_sprint_planning_rating,
                    "overall_risk_assessment_rating": f.overall_risk_assessment_rating,
                    "additional_comments": f.additional_comments,
                    "created_at": f.created_at,
                    "created_by": f.created_by
                }
                for f in feedback
            ]
        }
    except Exception as e:
        return {"success": False, "message": str(e)}


if __name__ == "__main__":
    import uvicorn
    # Use 0.0.0.0 to allow external connections on the same network
    uvicorn.run(app, host="0.0.0.0", port=8000)
