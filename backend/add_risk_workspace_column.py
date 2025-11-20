#!/usr/bin/env python3
"""
Add workspace_id column to risk_assessments table if it doesn't exist
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

def add_risk_workspace_column():
    """Add workspace_id column to risk_assessments table if it doesn't exist"""
    
    # Database connection string
    database_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/sprint_planning_db')
    
    try:
        # Create database engine
        engine = create_engine(database_url)
        
        with engine.connect() as connection:
            # Check if workspace_id column already exists
            check_query = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'risk_assessments' 
                AND column_name = 'workspace_id'
            """)
            
            result = connection.execute(check_query)
            column_exists = result.fetchone() is not None
            
            if column_exists:
                print("Column 'workspace_id' already exists in risk_assessments table")
                return
            
            # Add the workspace_id column
            alter_query = text("""
                ALTER TABLE risk_assessments 
                ADD COLUMN workspace_id INTEGER REFERENCES workspaces(id)
            """)
            
            connection.execute(alter_query)
            connection.commit()
            
            print("Successfully added 'workspace_id' column to risk_assessments table")
            
            # Verify the column was added
            verify_query = text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'risk_assessments' 
                AND column_name = 'workspace_id'
            """)
            
            result = connection.execute(verify_query)
            column_info = result.fetchone()
            
            if column_info:
                print(f"Column Details:")
                print(f"   - Name: {column_info[0]}")
                print(f"   - Type: {column_info[1]}")
                print(f"   - Nullable: {column_info[2]}")
            else:
                print("Warning: Column verification failed")
                    
    except SQLAlchemyError as e:
        print(f"Database error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("Adding workspace_id column to risk_assessments table...")
    add_risk_workspace_column()
    print("Done!")
