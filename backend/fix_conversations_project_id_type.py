#!/usr/bin/env python3
"""
Fix conversations.project_id column type - change from INTEGER to VARCHAR if needed
"""

import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/sprint_demo")

engine = create_engine(DATABASE_URL)

print("=" * 60)
print("FIXING CONVERSATIONS.PROJECT_ID COLUMN TYPE")
print("=" * 60)

with engine.connect() as conn:
    # Check if column exists and what type it is
    result = conn.execute(text("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'project_id'
    """))
    row = result.fetchone()
    
    if not row:
        print("❌ project_id column does NOT exist - adding it...")
        conn.execute(text("""
            ALTER TABLE conversations 
            ADD COLUMN project_id character varying
        """))
        conn.commit()
        print("✅ Added project_id column as VARCHAR")
        
        # Create index
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_conversations_project_id 
            ON conversations (project_id)
        """))
        conn.commit()
        print("✅ Created index on project_id")
    else:
        current_type = row[1]
        print(f"Current project_id type: {current_type}")
        
        if current_type == 'integer':
            print("❌ project_id is INTEGER - converting to VARCHAR...")
            
            # Drop foreign key constraint if it exists
            try:
                conn.execute(text("""
                    ALTER TABLE conversations 
                    DROP CONSTRAINT IF EXISTS fk_conversations_projects
                """))
                conn.commit()
                print("✅ Dropped foreign key constraint")
            except:
                pass
            
            # Convert column type
            # First, set all existing values to NULL (since we can't convert integer to UUID)
            conn.execute(text("UPDATE conversations SET project_id = NULL WHERE project_id IS NOT NULL"))
            conn.commit()
            print("✅ Cleared existing project_id values")
            
            # Alter column type
            conn.execute(text("""
                ALTER TABLE conversations 
                ALTER COLUMN project_id TYPE character varying USING NULL
            """))
            conn.commit()
            print("✅ Changed project_id column type to VARCHAR")
            
            # Recreate foreign key constraint
            try:
                conn.execute(text("""
                    ALTER TABLE conversations
                    ADD CONSTRAINT fk_conversations_projects
                    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
                """))
                conn.commit()
                print("✅ Recreated foreign key constraint")
            except Exception as e:
                print(f"⚠️  Could not recreate foreign key: {e}")
        elif current_type in ['character varying', 'varchar', 'text']:
            print("✅ project_id is already VARCHAR - no fix needed")
        else:
            print(f"⚠️  Unknown type: {current_type}")

print("\n" + "=" * 60)
print("✅ FIX COMPLETE - Please restart your backend server")
print("=" * 60 + "\n")

