# Pinecone Integration - Setup and Usage Guide

## 🌲 Overview

This document explains how the Pinecone integration works for indexing and querying knowledge base files.

## 📋 Requirements

1. **Pinecone API Key**: `pcsk_516zV7_UYRB2FRjcd1mP4PGgu7nu23Q5XWdSmAdxPwbGdvSpU5dsAkJRjBb7hxNCyueWcN`
2. **Pinecone Host**: `https://pmportal-e3d7aq9.svc.aped-4627-b74a.pinecone.io`
3. **Python Package**: `pinecone` (install with `pip install pinecone`)

## 🔧 Environment Variables

Add these to your `.env` file in the `backend/` directory:

```env
PINECONE_API_KEY=pcsk_516zV7_UYRB2FRjcd1mP4PGgu7nu23Q5XWdSmAdxPwbGdvSpU5dsAkJRjBb7hxNCyueWcN
PINECONE_HOST=https://pmportal-e3d7aq9.svc.aped-4627-b74a.pinecone.io
```

## 📝 How It Works

### Step 1: Select Files in Mandatory Files

When you select files in the "Mandatory Files" section and check "Use for Project":
- Files are added to the `project_knowledge_base_files` table
- Each file gets its own separate Pinecone index
- Index name format: `kb_file_{file_id}_{sanitized_filename}`

### Step 2: Automatic Indexing

When a file is added to the knowledge base:
1. **Create Index**: A new Pinecone index is created for that file
2. **Chunk Text**: Text is split into chunks of 400 characters with 100 character overlap
3. **Generate Embeddings**: Each chunk is converted to a 384-dimensional vector (all-MiniLM-L6-v2)
4. **Store in Pinecone**: Chunks are stored in the file's dedicated index

### Step 3: Querying (When User Asks Question Without Starting Project)

When a user asks a question without clicking "Start a Project":
1. **Get Knowledge Base Files**: Retrieve all files from `project_knowledge_base_files` table
2. **Get Index Names**: Build list of Pinecone index names for those files
3. **Generate Query Embedding**: Convert user question to embedding vector
4. **Search All Indexes**: Query all indexes simultaneously
5. **Compare Scores**: Find the index/file with highest similarity score
6. **Retrieve Top Chunks**: Get top 5 chunks across all indexes (sorted by score)
7. **Send to LLM**: Use best matching chunks with question to generate response

## 🎯 Chunking Parameters

- **Chunk Size**: 400 characters
- **Overlap**: 100 characters
- **Method**: Character-based (not word-based)

## 📊 Index Structure

Each Pinecone index contains:
- **Vectors**: 384-dimensional embeddings (all-MiniLM-L6-v2)
- **Metadata**:
  - `file_id`: Database ID of the file
  - `file_name`: Original filename
  - `chunk_index`: Index of the chunk within the file
  - `text`: First 1000 characters of chunk text (for reference)

## 🔍 Query Flow

```
User Question (without Start Project)
    ↓
Get all knowledge base files (from project_knowledge_base_files)
    ↓
Build list of Pinecone index names
    ↓
Generate query embedding
    ↓
Search across all indexes (top_k=3 per index)
    ↓
Sort all results by score (descending)
    ↓
Select top 5 chunks overall
    ↓
Find best matching file (highest score)
    ↓
Combine chunks with question → Send to Gemini LLM
    ↓
Return response
```

## 🛠️ Implementation Files

1. **`backend/services/pinecone_service.py`**: Pinecone client and operations
2. **`backend/services/chunking_service.py`**: Added `chunk_text_by_characters()` method
3. **`backend/main.py`**: 
   - Updated `/api/project-knowledge-base/add` to index files
   - Updated `/api/project-knowledge-base/remove` to delete indexes
   - Updated `/api/ask-question` to search Pinecone when no project started

## 🧪 Testing

### Test Indexing

1. Select files in "Mandatory Files" section
2. Check "Use for Project" for each file
3. Check backend logs for:
   - `🌲 [PINECONE] Indexing mandatory file X...`
   - `✅ [PINECONE] Successfully indexed N chunks`

### Test Querying

1. Ask a question WITHOUT clicking "Start a Project"
2. Check backend logs for:
   - `🌲 [ASK-QUESTION] No specific file provided, searching Pinecone knowledge base indexes...`
   - `🌲 [PINECONE] Searching across N indexes: [file1, file2]`
   - `🌲 [PINECONE] Best match: filename (score: X.XXX)`
   - `✅ [PINECONE] Retrieved N relevant chunks`

## 📝 Current Status

✅ **Completed:**
- Pinecone service created
- Character-based chunking (400 chars, 100 overlap)
- Automatic indexing when files added to knowledge base
- Query logic searches across all Pinecone indexes
- Score comparison and best match selection

## 🐛 Troubleshooting

### Index Creation Fails
- Check Pinecone API key is correct
- Verify Pinecone account has available index quota
- Check logs for specific error messages

### No Results Found
- Ensure files are selected in knowledge base
- Verify indexes exist: Check Pinecone dashboard
- Check if files have `extracted_text` populated

### Low Scores
- Verify embeddings are generated correctly
- Check chunk size/overlap settings
- Ensure query embedding matches document embeddings (same model)

## 📚 Next Steps

1. **Test with 2 files**: Select "CDO Templates (1).xlsx" and "Project Management Playbook.docx"
2. **Verify indexing**: Check Pinecone dashboard for created indexes
3. **Test queries**: Ask questions and verify correct file is selected
4. **Monitor scores**: Check if scores are reasonable (0.5-1.0 range)

