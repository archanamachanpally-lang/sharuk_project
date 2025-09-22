#!/usr/bin/env python3
"""
Script to create database tables
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://username:password@localhost:5432/sprint_demo")

def create_database_tables():
    """Create all required database tables"""
    try:
        # Create engine
        engine = create_engine(DATABASE_URL)
        
        # Create tables
        from models import Base
        Base.metadata.create_all(bind=engine)
        
        print("✅ Database tables created successfully!")
        
        # Test connection
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        # Test a simple query
        result = db.execute(text("SELECT 1"))
        print("✅ Database connection test successful!")
        
        db.close()
        
    except Exception as e:
        print(f"❌ Error creating database tables: {str(e)}")
        print("\n🔧 Troubleshooting steps:")
        print("1. Check your DATABASE_URL in .env file")
        print("2. Make sure PostgreSQL is running")
        print("3. Verify database credentials")
        print("4. Ensure database exists")

if __name__ == "__main__":
    print("🚀 Creating database tables...")
    print("=" * 50)
    create_database_tables()
    print("=" * 50)
    print("✨ Database setup completed!")
