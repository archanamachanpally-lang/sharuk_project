-- Add workspace_id column to risk_assessments table
-- This column references the workspaces table

-- First, check if the column already exists and add it if not
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'risk_assessments' 
        AND column_name = 'workspace_id'
    ) THEN
        ALTER TABLE risk_assessments 
        ADD COLUMN workspace_id INTEGER REFERENCES workspaces(id);
        
        RAISE NOTICE 'Added workspace_id column to risk_assessments table';
    ELSE
        RAISE NOTICE 'Column workspace_id already exists in risk_assessments table';
    END IF;
END $$;

-- Verify the column was added
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'risk_assessments' 
AND column_name = 'workspace_id';
