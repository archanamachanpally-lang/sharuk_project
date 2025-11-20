#!/usr/bin/env python3
"""
Direct fix script for projects table ID column type issue.
This script will fix the projects table if it has an INTEGER id instead of VARCHAR.
Run this if the automatic migration doesn't work.
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/sprint_demo")

def fix_projects_table():
    """Fix projects table ID column type"""
    print("=" * 60)
    print("FIXING PROJECTS TABLE ID COLUMN")
    print("=" * 60)
    
    engine = create_engine(DATABASE_URL)
    
    try:
        with engine.connect() as conn:
            # Check if table exists
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'projects'
                )
            """))
            table_exists = result.fetchone()[0]
            
            if not table_exists:
                print("✅ Projects table doesn't exist - will be created with correct schema")
                return True
            
            # Check current data type
            result = conn.execute(text("""
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = 'projects' AND column_name = 'id'
            """))
            row = result.fetchone()
            
            if not row:
                print("⚠️  Could not find id column in projects table")
                return False
            
            current_type = row[0]
            print(f"Current id column type: {current_type}")
            
            if current_type in ['character varying', 'varchar', 'text']:
                print("✅ Projects table already has correct VARCHAR id column - no fix needed")
                return True
            
            if current_type == 'integer':
                print("❌ Projects table has INTEGER id - fixing...")
                
                # Check if table has data
                count_result = conn.execute(text("SELECT COUNT(*) FROM projects"))
                row_count = count_result.fetchone()[0]
                print(f"Projects in table: {row_count}")
                
                if row_count == 0:
                    # Empty table - safe to drop
                    print("Table is empty - dropping and will be recreated...")
                    conn.execute(text("DROP TABLE IF EXISTS projects CASCADE"))
                    conn.commit()
                    print("✅ Dropped projects table - will be recreated with correct schema on next backend start")
                else:
                    # Has data - migrate it
                    print(f"Migrating {row_count} projects to new schema...")
                    
                    # Create new table with correct schema
                    conn.execute(text("""
                        CREATE TABLE projects_new (
                            id character varying PRIMARY KEY,
                            name character varying NOT NULL,
                            user_email character varying NOT NULL,
                            created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
                            updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
                        )
                    """))
                    conn.commit()
                    
                    # Migrate data
                    conn.execute(text("""
                        INSERT INTO projects_new (id, name, user_email, created_at, updated_at)
                        SELECT 
                            md5(random()::text || clock_timestamp()::text || id::text) AS id,
                            name,
                            user_email,
                            created_at,
                            updated_at
                        FROM projects
                    """))
                    conn.commit()
                    
                    # Drop old table
                    conn.execute(text("DROP TABLE projects CASCADE"))
                    conn.commit()
                    
                    # Rename new table
                    conn.execute(text("ALTER TABLE projects_new RENAME TO projects"))
                    conn.commit()
                    
                    # Recreate index
                    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_projects_user_email ON projects(user_email)"))
                    conn.commit()
                    
                    print(f"✅ Successfully migrated {row_count} projects to new schema")
                
                return True
            else:
                print(f"⚠️  Unknown id column type: {current_type}")
                return False
                
    except Exception as e:
        print(f"❌ Error fixing projects table: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("\n🔧 Running projects table fix script...\n")
    success = fix_projects_table()
    
    if success:
        print("\n" + "=" * 60)
        print("✅ FIX COMPLETE - Please restart your backend server")
        print("=" * 60 + "\n")
    else:
        print("\n" + "=" * 60)
        print("❌ FIX FAILED - Please check the error messages above")
        print("=" * 60 + "\n")
        sys.exit(1)

