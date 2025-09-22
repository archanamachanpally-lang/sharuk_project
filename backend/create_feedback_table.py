#!/usr/bin/env python3
"""
Script to create the feedback table
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://username:password@localhost:5432/sprint_demo")

def create_feedback_table():
    """Create the feedback table"""
    try:
        # Create engine
        engine = create_engine(DATABASE_URL)
        
        # Create tables
        from models import Base
        Base.metadata.create_all(bind=engine)
        
        print("✅ Feedback table created successfully!")
        
        # Test connection
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        # Test a simple query
        result = db.execute(text("SELECT 1"))
        print("✅ Database connection test successful!")
        
        # Check if feedback table exists
        result = db.execute(text("SELECT COUNT(*) FROM feedback"))
        count = result.scalar()
        print(f"✅ Feedback table exists with {count} records")
        
        db.close()
        
    except Exception as e:
        print(f"❌ Error creating feedback table: {str(e)}")
        print("\n🔧 Troubleshooting steps:")
        print("1. Check your DATABASE_URL in .env file")
        print("2. Make sure PostgreSQL is running")
        print("3. Verify database credentials")
        print("4. Ensure database exists")

if __name__ == "__main__":
    print("🚀 Creating feedback table...")
    print("=" * 50)
    create_feedback_table()
    print("=" * 50)
    print("✨ Feedback table setup completed!")
