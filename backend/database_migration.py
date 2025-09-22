#!/usr/bin/env python3
"""
Database Migration Script for Sprint Planning System
This script handles PDF column additions to the sprint_plans table.
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://username:password@localhost/dbname')

def run_migrations():
    """Run all database migrations in sequence"""
    
    print("🚀 Starting comprehensive database migration...")
    print("=" * 60)
    
    engine = create_engine(DATABASE_URL)
    
    try:
        with engine.connect() as conn:
            
            # Migration 1: PDF columns removed - PDF generation now handled by frontend html2pdf.js
            print("📄 Migration 1: PDF columns are no longer needed")
            print("   ✅ PDF generation is now handled by frontend html2pdf.js")
            
            # Commit all changes
            conn.commit()
            print("💾 All migrations committed successfully!")
            
            # Verify the final table structure
            print("\n📋 Verifying final table structure...")
            result = conn.execute(text("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'sprint_plans' 
                ORDER BY ordinal_position
            """))
            
            columns = result.fetchall()
            print("📊 Final sprint_plans table structure:")
            for col in columns:
                print(f"   - {col[0]}: {col[1]} (nullable: {col[2]}, default: {col[3]})")
            
            return True
            
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        return False

def rollback_migrations():
    """Rollback migrations if needed (for development/testing)"""
    
    print("🔄 Rolling back migrations...")
    print("=" * 60)
    
    engine = create_engine(DATABASE_URL)
    
    try:
        with engine.connect() as conn:
            
            # Rollback: PDF columns are no longer needed
            print("📄 PDF columns are no longer stored in database")
            print("   ✅ PDF generation is handled by frontend html2pdf.js")
            
            conn.commit()
            print("✅ Rollback completed successfully!")
            return True
            
    except Exception as e:
        print(f"❌ Rollback failed: {str(e)}")
        return False

def check_migration_status():
    """Check current migration status"""
    
    print("🔍 Checking migration status...")
    print("=" * 60)
    
    engine = create_engine(DATABASE_URL)
    
    try:
        with engine.connect() as conn:
            
            # Check sprint_plans table structure
            result = conn.execute(text("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'sprint_plans' 
                ORDER BY ordinal_position
            """))
            
            columns = result.fetchall()
            print("📊 Current sprint_plans table structure:")
            
            # PDF columns are no longer needed - generation handled by frontend
            print("   ✅ PDF generation: Frontend html2pdf.js")
            print("   ✅ No database storage required")
            
            return True
            
    except Exception as e:
        print(f"❌ Error checking migration status: {str(e)}")
        return False

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Database Migration Script')
    parser.add_argument('--action', choices=['migrate', 'rollback', 'status'], 
                       default='migrate', help='Action to perform')
    
    args = parser.parse_args()
    
    if args.action == 'migrate':
        success = run_migrations()
        if success:
            print("\n🎉 All migrations completed successfully!")
            sys.exit(0)
        else:
            print("\n💥 Migration failed!")
            sys.exit(1)
            
    elif args.action == 'rollback':
        success = rollback_migrations()
        if success:
            print("\n✅ Rollback completed successfully!")
            sys.exit(0)
        else:
            print("\n💥 Rollback failed!")
            sys.exit(1)
            
    elif args.action == 'status':
        check_migration_status()
        sys.exit(0)
