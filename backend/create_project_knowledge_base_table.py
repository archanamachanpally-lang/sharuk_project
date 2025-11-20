#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Migration script to create project_knowledge_base_files table
"""
import sys
import codecs

# Handle Windows encoding issues
if sys.platform == 'win32':
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import create_engine, text, inspect
from database import get_db_url

def create_project_knowledge_base_table():
    """Create project_knowledge_base_files table if it doesn't exist"""
    try:
        engine = create_engine(get_db_url())
        
        with engine.connect() as conn:
            # Check if table exists
            inspector = inspect(engine)
            if 'project_knowledge_base_files' in inspector.get_table_names():
                print("✓ Table 'project_knowledge_base_files' already exists")
                return True
            
            # Create table
            print("Creating table 'project_knowledge_base_files'...")
            conn.execute(text("""
                CREATE TABLE project_knowledge_base_files (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_email VARCHAR NOT NULL,
                    mandatory_file_id INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (mandatory_file_id) REFERENCES mandatory_files(id),
                    UNIQUE(user_email, mandatory_file_id)
                )
            """))
            
            # Create indexes
            conn.execute(text("""
                CREATE INDEX idx_project_kb_user_email ON project_knowledge_base_files(user_email)
            """))
            
            conn.execute(text("""
                CREATE INDEX idx_project_kb_file_id ON project_knowledge_base_files(mandatory_file_id)
            """))
            
            conn.commit()
            print("✓ Table 'project_knowledge_base_files' created successfully")
            print("✓ Indexes created successfully")
            return True
            
    except Exception as e:
        print(f"✗ Error creating table: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Project Knowledge Base Table Migration")
    print("=" * 60)
    
    success = create_project_knowledge_base_table()
    
    if success:
        print("\n✓ Migration completed successfully!")
        sys.exit(0)
    else:
        print("\n✗ Migration failed!")
        sys.exit(1)

