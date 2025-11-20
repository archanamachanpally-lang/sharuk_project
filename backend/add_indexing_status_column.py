"""
Legacy migration script: add `indexing_status` column to `uploaded_files`.

NOTE:
- This logic is now handled automatically by `db_migrations.run_migrations()`.
- The script is kept only for compatibility with older docs / manual runs.
- It is designed to be idempotent and safe to run multiple times.
"""

from sqlalchemy import text

from database import engine


def add_indexing_status_column() -> None:
    """Add indexing_status column to uploaded_files if it does not already exist."""
    with engine.connect() as conn:
        # Check if column already exists
        result = conn.execute(
            text(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'uploaded_files' AND column_name = 'indexing_status'
                """
            )
        )
        if result.fetchone() is not None:
            # Column already exists; nothing to do
            print("[MIGRATION] Column indexing_status already exists in uploaded_files")
            return

        # Add the column with default value
        print("[MIGRATION] Adding indexing_status column to uploaded_files...")
        conn.execute(
            text(
                """
                ALTER TABLE uploaded_files
                ADD COLUMN indexing_status VARCHAR DEFAULT 'pending_index'
                """
            )
        )
        conn.commit()

        # Backfill existing rows
        conn.execute(
            text(
                """
                UPDATE uploaded_files
                SET indexing_status = 'pending_index'
                WHERE indexing_status IS NULL
                """
            )
        )
        conn.commit()

        print("[MIGRATION] Added indexing_status column to uploaded_files table")


if __name__ == "__main__":
    add_indexing_status_column()


