-- Sprint Planning Demo Database Setup
-- PostgreSQL Database Schema (latest)

-- Create database (run this separately if needed)
-- CREATE DATABASE sprint_demo;

-- Connect to the database
-- \c sprint_demo;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Utility functions
-- ---------------------------------------------------------------------------

-- Create updated_at trigger function (reusable across tables)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sprint sessions table
CREATE TABLE IF NOT EXISTS sprint_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    session_id VARCHAR(255) REFERENCES sessions(id),
    status VARCHAR(50) DEFAULT 'active',
    responses JSONB DEFAULT '[]'::jsonb,
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Sprint plans table
CREATE TABLE IF NOT EXISTS sprint_plans (
    id SERIAL PRIMARY KEY,
    sprint_number VARCHAR(100),
    sprint_dates VARCHAR(255),
    sprint_duration VARCHAR(100),
    team_name VARCHAR(255),
    sprint_goal TEXT,
    total_hours_per_person VARCHAR(100),
    number_of_members VARCHAR(100),
    team_members JSONB,
    historical_story_points VARCHAR(100),
    backlog_items JSONB,
    definition_of_done TEXT,
    risks_and_impediments TEXT,
    generated_plan TEXT,
    word_document TEXT,
    sow_content TEXT,
    created_by VARCHAR(255),
    workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Risk assessments table
CREATE TABLE IF NOT EXISTS risk_assessments (
    id SERIAL PRIMARY KEY,
    project_name VARCHAR(255),
    project_dates VARCHAR(255),
    project_duration VARCHAR(100),
    team_name VARCHAR(255),
    project_scope TEXT,
    risk_categories JSONB,
    risk_mitigation TEXT,
    risk_monitoring TEXT,
    stakeholders JSONB,
    risk_matrix JSONB,
    risk_register JSONB,
    generated_assessment TEXT,
    word_document TEXT,
    created_by VARCHAR(255),
    workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Documents table for storing generated prompts/summaries
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    feature VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Feedback table
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255),
    clarity_of_sprint_goals VARCHAR(50),
    workload_distribution VARCHAR(50),
    plan_alignment_sow VARCHAR(50),
    suggestions_sprint_planning TEXT,
    risks_clear VARCHAR(50),
    mitigation_practical VARCHAR(50),
    suggestions_risk_assessment TEXT,
    overall_sprint_planning_rating VARCHAR(50),
    overall_risk_assessment_rating VARCHAR(50),
    additional_comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255)
);

-- Uploaded files table
CREATE TABLE IF NOT EXISTS uploaded_files (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    uploaded_by VARCHAR(255),
    upload_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Uploaded',
    extracted_text TEXT,
    indexing_status VARCHAR(50) DEFAULT 'pending_index'
);

-- Mandatory files table
CREATE TABLE IF NOT EXISTS mandatory_files (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size INTEGER,
    uploaded_by VARCHAR(255),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    extracted_text TEXT
);

-- Project knowledge base mapping table
CREATE TABLE IF NOT EXISTS project_knowledge_base_files (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    mandatory_file_id INTEGER NOT NULL REFERENCES mandatory_files(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_project_kb_user_file UNIQUE (user_email, mandatory_file_id)
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL,
    user_email VARCHAR(255),
    role VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Conversations table - stores full conversations as JSON
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    conversation_id UUID UNIQUE NOT NULL,
    chat_id UUID NOT NULL,
    user_email VARCHAR(255),
    conversation_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active);

CREATE INDEX IF NOT EXISTS idx_sprint_sessions_user_id ON sprint_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sprint_sessions_session_id ON sprint_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sprint_sessions_status ON sprint_sessions(status);

CREATE INDEX IF NOT EXISTS idx_sprint_plans_created_by ON sprint_plans(created_by);
CREATE INDEX IF NOT EXISTS idx_sprint_plans_workspace_id ON sprint_plans(workspace_id);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_created_by ON risk_assessments(created_by);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_workspace_id ON risk_assessments(workspace_id);

CREATE INDEX IF NOT EXISTS idx_documents_feature ON documents(feature);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at);

CREATE INDEX IF NOT EXISTS idx_feedback_created_by ON feedback(created_by);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_uploaded_by ON uploaded_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_status ON uploaded_files(status);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_indexing_status ON uploaded_files(indexing_status);

CREATE INDEX IF NOT EXISTS idx_mandatory_files_uploaded_by ON mandatory_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_mandatory_files_is_active ON mandatory_files(is_active);

CREATE INDEX IF NOT EXISTS idx_project_kb_files_user_email ON project_knowledge_base_files(user_email);
CREATE INDEX IF NOT EXISTS idx_project_kb_files_mandatory_file_id ON project_knowledge_base_files(mandatory_file_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_email ON chat_messages(user_email);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_conversations_conversation_id ON conversations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_chat_id ON conversations(chat_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_email ON conversations(user_email);

-- ---------------------------------------------------------------------------
-- Triggers to manage updated_at columns
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_workspaces_updated_at ON workspaces;
CREATE TRIGGER trg_workspaces_updated_at
    BEFORE UPDATE ON workspaces
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_project_kb_updated_at ON project_knowledge_base_files;
CREATE TRIGGER trg_project_kb_updated_at
    BEFORE UPDATE ON project_knowledge_base_files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_conversations_updated_at ON conversations;
CREATE TRIGGER trg_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Optional demo data
-- ---------------------------------------------------------------------------

INSERT INTO users (email, name, google_id)
VALUES ('demo@example.com', 'Demo User', 'google_demo_123')
ON CONFLICT (email) DO NOTHING;

INSERT INTO sessions (id, user_id, is_active, expires_at)
SELECT
    'demo_session_' || uuid_generate_v4(),
    u.id,
    TRUE,
    CURRENT_TIMESTAMP + INTERVAL '24 hours'
FROM users u
WHERE u.email = 'demo@example.com'
ON CONFLICT DO NOTHING;
