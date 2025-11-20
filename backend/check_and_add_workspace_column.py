#!/usr/bin/env python3
"""
Check and add workspace column to sprint_plans and risk_assessments tables
"""

import os
import sys
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import SQLAlchemyError

def check_and_add_workspace_column():
    """Check if workspace column exists and add it if it doesn't"""
    
    # Database connection string
    database_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/sprint_planning_db')
    
    try:
        # Create database engine
        engine = create_engine(database_url)
        
        with engine.connect() as connection:
            # Tables to update
            tables = ['sprint_plans', 'risk_assessments']
            
            for table in tables:
                try:
                    # Check if column already exists using information_schema
                    check_query = text(f"""
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = '{table}' 
                        AND column_name = 'workspace'
                    """)
                    
                    result = connection.execute(check_query)
                    column_exists = result.fetchone() is not None
                    
                    if column_exists:
                        print(f"Column 'workspace' already exists in {table} table - skipping")
                        continue
                    
                    # Add the new column
                    alter_query = text(f"""
                        ALTER TABLE {table} 
                        ADD COLUMN workspace VARCHAR(255)
                    """)
                    
                    connection.execute(alter_query)
                    connection.commit()
                    
                    print(f"Successfully added 'workspace' column to {table} table")
                    
                except Exception as e:
                    # If column already exists, PostgreSQL might throw an error
                    if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                        print(f"Column 'workspace' already exists in {table} table (caught error)")
                    else:
                        print(f"Warning: Could not add column to {table}: {e}")
                        # Don't fail the script - just continue
                    continue
                    
    except SQLAlchemyError as e:
        print(f"Database error: {e}")
        print("Note: This might happen if the database connection fails.")
        print("Please ensure your database is running and DATABASE_URL is correct.")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("Checking and adding workspace column if needed...")
    check_and_add_workspace_column()
    print("Done!")
