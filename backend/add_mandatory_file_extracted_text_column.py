#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Migration script to add extracted_text column to mandatory_files table
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Set UTF-8 encoding for Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Load environment variables
load_dotenv()

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://username:password@localhost:5432/sprint_demo')

def add_extracted_text_column():
    """Add extracted_text column to mandatory_files table"""
    
    print("Adding extracted_text column to mandatory_files table...")
    print("=" * 60)
    
    engine = create_engine(DATABASE_URL)
    
    try:
        with engine.connect() as conn:
            # Check if column already exists
            check_column = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'mandatory_files' 
                AND column_name = 'extracted_text'
            """))
            
            if check_column.fetchone():
                print("[OK] Column 'extracted_text' already exists in mandatory_files table")
                return True
            
            # Add the column
            print("[INFO] Adding extracted_text column...")
            conn.execute(text("""
                ALTER TABLE mandatory_files 
                ADD COLUMN extracted_text TEXT
            """))
            
            conn.commit()
            print("[SUCCESS] Successfully added extracted_text column to mandatory_files table!")
            
            # Verify the column was added
            result = conn.execute(text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'mandatory_files' 
                AND column_name = 'extracted_text'
            """))
            
            column = result.fetchone()
            if column:
                print(f"[INFO] Column details: {column[0]} ({column[1]}, nullable: {column[2]})")
            
            return True
            
    except Exception as e:
        print(f"[ERROR] Migration failed: {str(e)}")
        return False

if __name__ == "__main__":
    success = add_extracted_text_column()
    if success:
        print("\n[SUCCESS] Migration completed successfully!")
        sys.exit(0)
    else:
        print("\n[ERROR] Migration failed!")
        sys.exit(1)

