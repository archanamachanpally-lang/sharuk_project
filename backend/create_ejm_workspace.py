#!/usr/bin/env python3
"""
Script to create the default EJM workspace in the database.
"""

import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import Base, Workspace

# Load environment variables
load_dotenv()

def create_ejm_workspace():
    """Create the default EJM workspace"""
    try:
        # Database URL from environment variable
        DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://username:password@localhost:5432/sprint_demo")
        
        # Create SQLAlchemy engine
        engine = create_engine(DATABASE_URL)
        
        # Create SessionLocal class
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        
        # Create database tables if they don't exist
        Base.metadata.create_all(bind=engine)
        
        # Create a session
        db = SessionLocal()
        
        try:
            # Check if EJM workspace already exists
            existing_workspace = db.query(Workspace).filter(Workspace.name == "EJM").first()
            
            if existing_workspace:
                print(f"EJM workspace already exists (ID: {existing_workspace.id})")
                return True
            else:
                # Create new EJM workspace
                workspace = Workspace(
                    name="EJM",
                    description="Default EJM workspace",
                    is_default=True
                )
                
                db.add(workspace)
                db.commit()
                db.refresh(workspace)
                
                print(f"Created EJM workspace (ID: {workspace.id})")
                return True
            
        except Exception as e:
            print(f"Error creating workspace: {str(e)}")
            db.rollback()
            return False
        finally:
            db.close()
            
    except Exception as e:
        print(f"Database connection error: {str(e)}")
        return False

if __name__ == "__main__":
    print("Creating EJM workspace...")
    success = create_ejm_workspace()
    
    if success:
        print("EJM workspace created successfully!")
    else:
        print("Failed to create EJM workspace!")
        sys.exit(1)
