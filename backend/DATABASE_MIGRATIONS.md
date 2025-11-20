# Automatic Database Migrations

## Overview

The backend now includes automatic database migrations that run on startup. This ensures that all required tables and columns exist, even if someone runs the backend on a fresh database or an older version.

## How It Works

1. **On Backend Startup:**
   - SQLAlchemy creates all tables defined in `models.py` (if they don't exist)
   - Automatic migrations check for missing columns and add them

2. **Migrations Run Automatically:**
   - No manual scripts needed
   - Safe to run multiple times (idempotent)
   - Only adds missing columns, doesn't modify existing data

## Migrations Included

### 1. `uploaded_files` table
- ✅ `indexing_status` column (VARCHAR, default: 'pending_index')
  - Used for tracking Pinecone indexing status

### 2. `mandatory_files` table
- ✅ `extracted_text` column (TEXT)
  - Stores extracted text content from files

### 3. `sprint_plans` table
- ✅ `workspace_id` column (INTEGER, nullable)
  - Foreign key to workspaces table
- ✅ `word_document` column (TEXT)
  - Stores Word document content

### 4. `risk_assessments` table
- ✅ `workspace_id` column (INTEGER, nullable)
  - Foreign key to workspaces table
- ✅ `word_document` column (TEXT)
  - Stores Word document content

## Usage

**No action needed!** Migrations run automatically when you start the backend:

```bash
cd backend
python main.py
# or
uvicorn main:app --reload
```

You'll see log messages like:
```
[MIGRATION] Column indexing_status already exists in uploaded_files
[MIGRATION] Database schema is up-to-date, no migrations needed
```

Or if migrations are needed:
```
[MIGRATION] Added indexing_status column to uploaded_files table
[MIGRATION] Applied 1 migration(s): Added indexing_status to uploaded_files
```

## Manual Migration Scripts (Legacy)

The following scripts were used previously but are now handled automatically:
- `add_indexing_status_column.py` - ✅ Now automatic
- `add_mandatory_file_extracted_text_column.py` - ✅ Now automatic
- Other migration scripts - ✅ Now automatic

**You don't need to run these manually anymore!**

## Troubleshooting

If migrations fail, check:
1. Database connection (DATABASE_URL in .env)
2. Database permissions (need ALTER TABLE permission)
3. Database logs for specific errors

Migrations are safe - they only add columns, never delete or modify existing data.

