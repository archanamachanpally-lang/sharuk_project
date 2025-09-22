#!/usr/bin/env python3
"""
Database Migration Script: Add word_document column to sprint_plans table

This script adds a new column 'word_document' to store Word document content
that is a replica of the HTML rendered output with all formatting preserved.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

# Add the parent directory to the path to import database module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def add_word_document_column():
    """Add word_document column to sprint_plans table"""
    
    # Database connection string
    database_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/sprint_planning_db')
    
    try:
        # Create database engine
        engine = create_engine(database_url)
        
        with engine.connect() as connection:
            # Check if column already exists
            check_query = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'sprint_plans' 
                AND column_name = 'word_document'
            """)
            
            result = connection.execute(check_query)
            column_exists = result.fetchone() is not None
            
            if column_exists:
                print("✅ Column 'word_document' already exists in sprint_plans table")
                return
            
            # Add the new column
            alter_query = text("""
                ALTER TABLE sprint_plans 
                ADD COLUMN word_document TEXT
            """)
            
            connection.execute(alter_query)
            connection.commit()
            
            print("✅ Successfully added 'word_document' column to sprint_plans table")
            print("📝 This column will store Word document content as a replica of HTML output")
            
            # Verify the column was added
            verify_query = text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'sprint_plans' 
                AND column_name = 'word_document'
            """)
            
            result = connection.execute(verify_query)
            column_info = result.fetchone()
            
            if column_info:
                print(f"🔍 Column Details:")
                print(f"   - Name: {column_info[0]}")
                print(f"   - Type: {column_info[1]}")
                print(f"   - Nullable: {column_info[2]}")
            else:
                print("❌ Warning: Column verification failed")
                
    except SQLAlchemyError as e:
        print(f"❌ Database error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("🚀 Starting database migration: Add word_document column")
    print("=" * 60)
    
    add_word_document_column()
    
    print("=" * 60)
    print("✅ Migration completed successfully!")
    print("\n📋 Next steps:")
    print("   1. Restart your backend server")
    print("   2. The new column will be available for storing Word documents")
    print("   3. Update your sprint plan creation logic to include Word generation")
