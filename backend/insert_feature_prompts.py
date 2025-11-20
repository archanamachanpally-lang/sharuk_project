#!/usr/bin/env python3
"""
Script to insert feature prompts into the documents table
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sprint_planning.db")

# Create engine and session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def insert_feature_prompts():
    """Insert feature prompts into the documents table"""
    
    # Feature prompts data
    feature_prompts = [
        {
            "feature": "WeeklyStatusReport",
            "prompt": """You are a Project Manager. I will provide you a JIRA export file (in Excel/CSV format) for the current sprint/week. Based on this data, generate a professional and concise Weekly Status Report for the project.

Include the following sections:
Key Highlights
Work Completed This Week
Work In Progress
Upcoming Tasks
Risks and Blockers
Sprint Velocity or Progress Stats
Stakeholder Notes (if applicable)
Use bullet points and a clear, executive-friendly tone. Group work items by Epics or Components where possible. Mention ticket counts, progress %, and any deviations from the plan. Prioritize information that would help leadership understand current project health."""
        },
        {
            "feature": "RiskAssessment",
            "prompt": """As a Risk Assessment specialist, generate ONLY a Risk Register based on the provided project information.

You will receive structured project data including:
- All Risks Data (comprehensive array of all individual risks with detailed information)

IMPORTANT: The "all_risks_data" field contains the core risk information. This is an array where each element represents a complete risk with:
- riskId: Unique identifier (e.g., RISK-001, RISK-002)
- summary: Brief risk summary
- description: Detailed risk description
- priority: Risk priority level (High/Medium/Low)
- status: Current risk status (Open/In Progress/Closed)
- assignee: Person responsible for the risk
- reporter: Person who identified/reported the risk
- createdDate: When the risk was identified
- comments: Additional comments about the risk
- mitigation: Mitigation strategies for the risk

OUTPUT FORMAT REQUIREMENTS:
Present the Risk Register as a clear, structured list. Each risk should be a separate section with all identified fields clearly labeled, following this EXACT HTML format:

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

CRITICAL INSTRUCTIONS:
- Generate the Risk Register section with ALL provided risks
- After the Risk Register, include a Risk Confidence section
- Do NOT include Executive Summary, Project Overview, Risk Categories Analysis, Stakeholder Assessment, Risk Matrix, or any other sections
- Handle ALL provided risks in the all_risks_data array
- Each risk must be wrapped in a <div class="risk-section"> with proper HTML formatting
- Use <h3> for Risk ID and <p><strong> for other fields
- Do NOT use asterisks (*) or markdown formatting
- If the data contains columns not explicitly mentioned, ignore them unless they offer critical context for the specified risk fields
- Focus only on the 8 specified fields for each risk
- Do NOT include any validation messages or status indicators

RISK CONFIDENCE SECTION:
After completing the Risk Register, add a Risk Confidence section with the following format:
   <div class="risk-confidence-section">
   <h2>Risk Confidence</h2>
   <p><strong>Confidence Score:</strong> [Provide a score out of 10 or percentage] for achieving the Sprint Goal</p>
   <p><strong>Rationale:</strong> [Brief explanation of the confidence score, considering the identified risks, severity levels, mitigation plans, and team capacity]</p>
   </div>

The confidence score should:
- Be based on comprehensive analysis of all identified risks
- Consider risk severity (High/Medium/Low) and their potential impact
- Evaluate the effectiveness of mitigation plans
- Take into account team capacity and project scope
- Provide actionable insights for stakeholders

Generate a clean, professional Risk Register followed by the Risk Confidence section, all with proper HTML formatting."""
        }
    ]
    
    try:
        # Create a session
        db = SessionLocal()
        
        # Check if prompts already exist
        for prompt_data in feature_prompts:
            feature_name = prompt_data["feature"]
            
            # Check if the feature already exists
            existing = db.execute(
                text("SELECT id FROM documents WHERE feature = :feature"),
                {"feature": feature_name}
            ).fetchone()
            
            if existing:
                print(f"🔄 Updating existing feature '{feature_name}' (ID: {existing.id})")
                # Update the existing prompt
                result = db.execute(
                    text("UPDATE documents SET prompt = :prompt WHERE feature = :feature"),
                    {
                        "feature": prompt_data["feature"],
                        "prompt": prompt_data["prompt"]
                    }
                )
            else:
                print(f"➕ Inserting new feature '{feature_name}'")
                # Insert the new prompt
                result = db.execute(
                    text("INSERT INTO documents (feature, prompt) VALUES (:feature, :prompt)"),
                    {
                        "feature": prompt_data["feature"],
                        "prompt": prompt_data["prompt"]
                    }
                )
            
            # Get the inserted/updated ID
            if existing:
                inserted_id = existing.id
            else:
                inserted_id = db.execute(
                    text("SELECT currval(pg_get_serial_sequence('documents', 'id'))")
                ).fetchone()[0]
            
            print(f"✅ Successfully inserted '{feature_name}' prompt (ID: {inserted_id})")
            print(f"   Prompt length: {len(prompt_data['prompt'])} characters")
            print(f"   First 100 chars: {prompt_data['prompt'][:100]}...")
            print()
        
        # Commit the changes
        db.commit()
        print("🎉 All feature prompts have been successfully inserted!")
        
    except Exception as e:
        print(f"❌ Error inserting feature prompts: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Starting feature prompts insertion...")
    print("=" * 50)
    insert_feature_prompts()
    print("=" * 50)
    print("✨ Feature prompts insertion completed!")
