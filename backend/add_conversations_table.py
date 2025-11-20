"""
Migration script to add conversations table for storing chat conversations as JSON.
Run this script to add the conversations table to your existing database.
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/sprint_demo")

def add_conversations_table():
    """Add conversations table to the database."""
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # Create conversations table
        session.execute(text("""
            CREATE TABLE IF NOT EXISTS conversations (
                id SERIAL PRIMARY KEY,
                conversation_id VARCHAR(255) UNIQUE NOT NULL,
                chat_id VARCHAR(255) NOT NULL,
                user_email VARCHAR(255),
                conversation_json JSONB NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))
        
        # Create indexes
        session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_conversations_conversation_id ON conversations(conversation_id);
        """))
        session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_conversations_chat_id ON conversations(chat_id);
        """))
        session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_conversations_user_email ON conversations(user_email);
        """))
        
        # Create trigger for updated_at
        session.execute(text("""
            DROP TRIGGER IF EXISTS trg_conversations_updated_at ON conversations;
        """))
        session.execute(text("""
            CREATE TRIGGER trg_conversations_updated_at
                BEFORE UPDATE ON conversations
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        """))
        
        session.commit()
        print("✅ Conversations table created successfully!")
        print("✅ Indexes created successfully!")
        print("✅ Trigger created successfully!")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error creating conversations table: {str(e)}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    add_conversations_table()

