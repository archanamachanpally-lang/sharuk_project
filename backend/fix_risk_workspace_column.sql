-- Add workspace_id column to risk_assessments table
ALTER TABLE risk_assessments 
ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id);
