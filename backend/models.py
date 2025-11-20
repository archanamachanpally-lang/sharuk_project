from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, JSON, ForeignKey, UniqueConstraint, LargeBinary
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
    
    # Workspace for this plan - foreign key to workspaces table
    workspace_id = Column(Integer, ForeignKey('workspaces.id'), nullable=True)
    
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
    
    # Workspace for this assessment - foreign key to workspaces table
    workspace_id = Column(Integer, ForeignKey('workspaces.id'), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    feature = Column(String, nullable=False)
    prompt = Column(Text, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

class Workspace(Base):
    __tablename__ = "workspaces"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    description = Column(Text)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

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

class UploadedFile(Base):
    __tablename__ = "uploaded_files"
    
    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # pdf, docx, txt, etc.
    file_path = Column(String, nullable=False)  # Path where file is stored
    uploaded_by = Column(String, index=True)  # User email or username
    upload_time = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String, default="Uploaded")  # Uploaded, Processing, Processed, Error
    extracted_text = Column(Text)  # Extracted text content from the file
    indexing_status = Column(String, default="pending_index")  # pending_index, indexed, error

class MandatoryFile(Base):
    __tablename__ = "mandatory_files"
    
    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # pdf, docx, txt, xlsx, etc.
    file_path = Column(String, nullable=True)  # Legacy: Path where file was stored on disk (deprecated, kept for backward compatibility)
    file_content = Column(LargeBinary, nullable=True)  # File content stored in database
    file_size = Column(Integer)  # File size in bytes
    uploaded_by = Column(String, index=True)  # User email or username
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    description = Column(String)  # Optional description
    is_active = Column(Boolean, default=True)  # For soft delete
    extracted_text = Column(Text)  # Extracted text content from the file (for search/indexing)

class ProjectKnowledgeBaseFile(Base):
    __tablename__ = "project_knowledge_base_files"
    
    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, nullable=False, index=True)  # User email who selected the file
    mandatory_file_id = Column(Integer, ForeignKey("mandatory_files.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Ensure unique combination of user and file
    __table_args__ = (
        UniqueConstraint('user_email', 'mandatory_file_id', name='uq_user_file'),
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    chat_id = Column(String, index=True, nullable=False)
    user_email = Column(String, index=True)
    role = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(String, unique=True, index=True, nullable=False)
    chat_id = Column(String, index=True, nullable=False)
    user_email = Column(String, index=True)
    project_id = Column(String, index=True, nullable=True)  # Foreign key to projects.id
    conversation_json = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    user_email = Column(String, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())