-- Quick fix: Add project_id column to conversations table if it doesn't exist
-- Run this in your database if migrations didn't run

-- Check if column exists first
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'conversations' AND column_name = 'project_id'
    ) THEN
        -- Add project_id column
        ALTER TABLE conversations 
        ADD COLUMN project_id character varying;
        
        -- Create index
        CREATE INDEX IF NOT EXISTS idx_conversations_project_id 
        ON conversations (project_id);
        
        -- Add foreign key constraint
        ALTER TABLE conversations
        ADD CONSTRAINT fk_conversations_projects
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Added project_id column to conversations table';
    ELSE
        RAISE NOTICE 'project_id column already exists in conversations table';
    END IF;
END $$;

