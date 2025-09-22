-- Sprint Planning Demo Database Setup
-- PostgreSQL Database Schema

-- Create database (run this separately if needed)
-- CREATE DATABASE sprint_demo;

-- Connect to the database
-- \c sprint_demo;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Sprint sessions table
CREATE TABLE IF NOT EXISTS sprint_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    session_id VARCHAR(255) REFERENCES sessions(id),
    status VARCHAR(50) DEFAULT 'active',
    responses JSONB DEFAULT '[]',
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Documents table for storing generated summaries
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    feature VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_sprint_sessions_user_id ON sprint_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sprint_sessions_session_id ON sprint_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sprint_sessions_status ON sprint_sessions(status);
CREATE INDEX IF NOT EXISTS idx_documents_feature ON documents(feature);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for users table
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();



-- Insert demo data (optional)
INSERT INTO users (email, name, google_id) 
VALUES ('demo@example.com', 'Demo User', 'google_demo_123')
ON CONFLICT (email) DO NOTHING;

-- Create a demo session
INSERT INTO sessions (id, user_id, is_active, expires_at)
SELECT 
    'demo_session_' || uuid_generate_v4(),
    u.id,
    TRUE,
    CURRENT_TIMESTAMP + INTERVAL '24 hours'
FROM users u 
WHERE u.email = 'demo@example.com'
ON CONFLICT DO NOTHING;

 