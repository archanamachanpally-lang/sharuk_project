#!/usr/bin/env python3
"""
Check conversations table schema to verify project_id column exists
"""

import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/sprint_demo")

engine = create_engine(DATABASE_URL)
with engine.connect() as conn:
    # Check if project_id column exists
    result = conn.execute(text("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'project_id'
    """))
    row = result.fetchone()
    
    if row:
        print(f"✅ project_id column exists: {row[1]} (nullable: {row[2]})")
    else:
        print("❌ project_id column does NOT exist in conversations table")
        print("   Run migrations or add it manually:")
        print("   ALTER TABLE conversations ADD COLUMN project_id character varying;")

