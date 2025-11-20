"""
Migration script to create the chat_messages table for storing chatbot history.
Run this script once after setting DATABASE_URL to ensure the table exists.
"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://username:password@localhost:5432/sprint_demo")

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL,
    user_email VARCHAR(255),
    role VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
"""

CREATE_INDEXES_SQL = [
    "CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);",
    "CREATE INDEX IF NOT EXISTS idx_chat_messages_user_email ON chat_messages(user_email);",
    "CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);"
]


def ensure_uuid_extension(conn):
    """Ensure uuid-ossp extension exists for uuid_generate_v4()."""
    conn.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'))
    conn.commit()


def create_chat_messages_table():
    """Create chat_messages table and related indexes if they do not exist."""
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as conn:
            ensure_uuid_extension(conn)
            conn.execute(text(CREATE_TABLE_SQL))
            conn.commit()

            for index_sql in CREATE_INDEXES_SQL:
                conn.execute(text(index_sql))
            conn.commit()

            print("[SUCCESS] chat_messages table is ready.")
    except Exception as exc:
        print(f"[ERROR] Failed to create chat_messages table: {exc}")
        print("\n[TROUBLESHOOTING]")
        print("1. Verify DATABASE_URL in backend/.env")
        print("2. Ensure PostgreSQL is running and reachable")
        print("3. Confirm the database user has CREATE TABLE permissions")


if __name__ == "__main__":
    print("[INFO] Creating chat_messages table…")
    create_chat_messages_table()


