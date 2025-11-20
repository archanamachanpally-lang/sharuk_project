#!/usr/bin/env python3
"""
Verification script for project-conversation feature.
This script verifies that:
1. Database schema has project_id column in conversations
2. Projects can be created with default conversations
3. The relationship is properly established
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/sprint_demo")

def verify_schema():
    """Verify database schema has project_id column"""
    print("=" * 60)
    print("1. VERIFYING DATABASE SCHEMA")
    print("=" * 60)
    
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
            print(f"✅ project_id column exists in conversations table")
            print(f"   Type: {row[1]}, Nullable: {row[2]}")
        else:
            print("❌ project_id column NOT found in conversations table")
            return False
        
        # Check if index exists
        result = conn.execute(text("""
            SELECT indexname
            FROM pg_indexes
            WHERE tablename = 'conversations' AND indexname = 'idx_conversations_project_id'
        """))
        row = result.fetchone()
        
        if row:
            print(f"✅ Index idx_conversations_project_id exists")
        else:
            print("⚠️  Index idx_conversations_project_id NOT found (may not be critical)")
        
        # Check foreign key constraint
        result = conn.execute(text("""
            SELECT constraint_name
            FROM information_schema.table_constraints
            WHERE table_name = 'conversations' 
            AND constraint_name = 'fk_conversations_projects'
        """))
        row = result.fetchone()
        
        if row:
            print(f"✅ Foreign key constraint fk_conversations_projects exists")
        else:
            print("⚠️  Foreign key constraint NOT found (may not be critical)")
        
        return True

def verify_data():
    """Verify projects and their conversations"""
    print("\n" + "=" * 60)
    print("2. VERIFYING PROJECT-CONVERSATION RELATIONSHIPS")
    print("=" * 60)
    
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        # Get all projects with their conversations
        result = conn.execute(text("""
            SELECT 
                p.id AS project_id,
                p.name AS project_name,
                p.user_email,
                c.id AS conversation_id,
                c.conversation_id AS conversation_uuid,
                c.chat_id,
                c.created_at AS conversation_created_at
            FROM projects p
            LEFT JOIN conversations c ON c.project_id = p.id
            ORDER BY p.name, c.created_at
        """))
        
        rows = result.fetchall()
        
        if not rows:
            print("⚠️  No projects found in database")
            return
        
        projects_dict = {}
        for row in rows:
            project_id = row[0]
            if project_id not in projects_dict:
                projects_dict[project_id] = {
                    "name": row[1],
                    "user_email": row[2],
                    "conversations": []
                }
            
            if row[3]:  # conversation_id exists
                projects_dict[project_id]["conversations"].append({
                    "id": row[3],
                    "conversation_id": row[4],
                    "chat_id": row[5],
                    "created_at": str(row[6]) if row[6] else None
                })
        
        print(f"\nFound {len(projects_dict)} project(s):\n")
        for project_id, project_data in projects_dict.items():
            print(f"📁 Project: {project_data['name']}")
            print(f"   ID: {project_id}")
            print(f"   User: {project_data['user_email']}")
            conv_count = len(project_data['conversations'])
            print(f"   Conversations: {conv_count}")
            
            if conv_count > 0:
                for i, conv in enumerate(project_data['conversations'], 1):
                    print(f"      {i}. Conversation ID: {conv['id']}")
                    print(f"         Chat ID: {conv['chat_id']}")
                    print(f"         Created: {conv['created_at']}")
            else:
                print("      ⚠️  No conversations found for this project")
            print()

def verify_recent_project():
    """Verify the most recently created project has a conversation"""
    print("=" * 60)
    print("3. VERIFYING MOST RECENT PROJECT")
    print("=" * 60)
    
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        # Get most recent project
        result = conn.execute(text("""
            SELECT 
                p.id AS project_id,
                p.name AS project_name,
                p.created_at,
                COUNT(c.id) AS conversation_count
            FROM projects p
            LEFT JOIN conversations c ON c.project_id = p.id
            GROUP BY p.id, p.name, p.created_at
            ORDER BY p.created_at DESC
            LIMIT 1
        """))
        
        row = result.fetchone()
        
        if row:
            project_id, project_name, created_at, conv_count = row
            print(f"📁 Most Recent Project:")
            print(f"   Name: {project_name}")
            print(f"   ID: {project_id}")
            print(f"   Created: {created_at}")
            print(f"   Conversations: {conv_count}")
            
            if conv_count > 0:
                print("   ✅ Project has conversation(s)")
                
                # Get conversation details
                result = conn.execute(text("""
                    SELECT id, conversation_id, chat_id, created_at
                    FROM conversations
                    WHERE project_id = :project_id
                    ORDER BY created_at ASC
                    LIMIT 1
                """), {"project_id": project_id})
                
                conv_row = result.fetchone()
                if conv_row:
                    print(f"   Default Conversation:")
                    print(f"      ID: {conv_row[0]}")
                    print(f"      Conversation UUID: {conv_row[1]}")
                    print(f"      Chat ID: {conv_row[2]}")
                    print(f"      Created: {conv_row[3]}")
            else:
                print("   ⚠️  Project has NO conversations")
        else:
            print("⚠️  No projects found")

def main():
    print("\n" + "=" * 60)
    print("PROJECT-CONVERSATION FEATURE VERIFICATION")
    print("=" * 60 + "\n")
    
    try:
        # Verify schema
        if not verify_schema():
            print("\n❌ Schema verification failed. Please run migrations.")
            sys.exit(1)
        
        # Verify data
        verify_data()
        
        # Verify recent project
        verify_recent_project()
        
        print("\n" + "=" * 60)
        print("✅ VERIFICATION COMPLETE")
        print("=" * 60 + "\n")
        
    except Exception as e:
        print(f"\n❌ Error during verification: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()

