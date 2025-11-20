#!/usr/bin/env python3
"""
Database Migration Script: Add workspace column to sprint_plans and risk_assessments tables
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

def add_workspace_column():
    """Add workspace column to sprint_plans and risk_assessments tables"""
    
    # Database connection string
    database_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/sprint_planning_db')
    
    try:
        # Create database engine
        engine = create_engine(database_url)
        
        with engine.connect() as connection:
            # Tables to update
            tables = ['sprint_plans', 'risk_assessments']
            
            for table in tables:
                # Check if column already exists
                check_query = text(f"""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = '{table}' 
                    AND column_name = 'workspace'
                """)
                
                result = connection.execute(check_query)
                column_exists = result.fetchone() is not None
                
                if column_exists:
                    print(f"Column 'workspace' already exists in {table} table")
                    continue
                
                # Add the new column
                alter_query = text(f"""
                    ALTER TABLE {table} 
                    ADD COLUMN workspace VARCHAR(255)
                """)
                
                connection.execute(alter_query)
                connection.commit()
                
                print(f"Successfully added 'workspace' column to {table} table")
                
                # Verify the column was added
                verify_query = text(f"""
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns 
                    WHERE table_name = '{table}' 
                    AND column_name = 'workspace'
                """)
                
                result = connection.execute(verify_query)
                column_info = result.fetchone()
                
                if column_info:
                    print(f"Column Details for {table}:")
                    print(f"   - Name: {column_info[0]}")
                    print(f"   - Type: {column_info[1]}")
                    print(f"   - Nullable: {column_info[2]}")
                else:
                    print(f"Warning: Column verification failed for {table}")
                    
    except SQLAlchemyError as e:
        print(f"Database error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("Starting workspace column migration...")
    add_workspace_column()
    print("Migration completed successfully!")
