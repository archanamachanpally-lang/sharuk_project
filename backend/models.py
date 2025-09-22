from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, JSON, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import uuid

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    google_id = Column(String, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))

class SprintSession(Base):
    __tablename__ = "sprint_sessions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, index=True)
    session_id = Column(String, index=True)
    status = Column(String, default="active")  # active, completed
    responses = Column(JSON, default=list)
    summary = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))

class SprintPlan(Base):
    __tablename__ = "sprint_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # I. Sprint Overview & Proposed Goal
    sprint_number = Column(String)
    sprint_dates = Column(String)
    sprint_duration = Column(String)
    team_name = Column(String)
    sprint_goal = Column(Text)
    
    # II. Team Capacity & Availability
    total_hours_per_person = Column(String)
    number_of_members = Column(String)
    team_members = Column(JSON)  # Array of team member objects
    historical_story_points = Column(String)
    
    # III. Prioritized Product Backlog Items
    backlog_items = Column(JSON)  # Array of backlog item objects
    
    # IV. Definition of Done (DoD)
    definition_of_done = Column(Text)
    
    # V. Known Impediments, Dependencies & Risks
    risks_and_impediments = Column(Text)
    
    # Generated Plan
    generated_plan = Column(Text)
    
    # Word Document (replica of HTML rendered output)
    word_document = Column(Text)
    
    # Optional SOW content attached at creation
    sow_content = Column(Text)
    
    # User who created this plan
    created_by = Column(String, index=True)  # Store user email
    
    # PDF generation is now handled by frontend html2pdf.js
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())



class RiskAssessment(Base):
    __tablename__ = "risk_assessments"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Risk Assessment Overview
    project_name = Column(String)
    project_dates = Column(String)
    project_duration = Column(String)
    team_name = Column(String)
    project_scope = Column(Text)
    
    # Risk Categories & Analysis
    risk_categories = Column(JSON)  # Array of risk category objects
    risk_mitigation = Column(Text)
    risk_monitoring = Column(Text)
    
    # Stakeholder Information
    stakeholders = Column(JSON)  # Array of stakeholder objects
    
    # Risk Assessment Details
    risk_matrix = Column(JSON)  # Risk probability/impact matrix
    risk_register = Column(JSON)  # Detailed risk register
    
    # Generated Assessment
    generated_assessment = Column(Text)
    
    # Word Document (replica of HTML rendered output)
    word_document = Column(Text)
    
    # User who created this assessment
    created_by = Column(String, index=True)  # Store user email
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    feature = Column(String, nullable=False)
    prompt = Column(Text, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

class Feedback(Base):
    __tablename__ = "feedback"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic Information
    name = Column(String)
    email = Column(String)
    
    # Sprint Planning Feedback
    clarity_of_sprint_goals = Column(String)  # Rating: 1-5
    workload_distribution = Column(String)   # Rating: 1-5
    plan_alignment_sow = Column(String)      # Yes/No/Partial
    suggestions_sprint_planning = Column(Text)
    
    # Risk Assessment Feedback
    risks_clear = Column(String)            # Yes/No
    mitigation_practical = Column(String)   # Yes/No
    suggestions_risk_assessment = Column(Text)
    
    # Overall Feedback
    overall_sprint_planning_rating = Column(String)  # Rating: 1-5
    overall_risk_assessment_rating = Column(String)  # Rating: 1-5
    
    # Additional Comments
    additional_comments = Column(Text)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(String, index=True)  # Store user email 