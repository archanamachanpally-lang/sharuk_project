# File Upload and Query Flow - Quick Summary

## 📤 FILE UPLOAD FLOW

```
1. User Uploads File
   ↓
2. Save to Disk: backend/uploads/{uuid}_{filename}
   ↓
3. Extract Text (PDF/DOCX/TXT/XLSX)
   ↓
4. Save to PostgreSQL:
   - Table: uploaded_files
   - Stores: file_path, extracted_text, metadata
   ↓
5. Index in Pinecone:
   - Chunk text (400 characters, 100-char overlap)
   - Generate embeddings (384-dim vectors)
   - Upsert chunks + metadata to Pinecone index
   ↓
6. Update Database: indexing_status = "indexed"
```

## 🔍 QUERY FLOW (When User Asks Question)

```
1. User Asks Question with file_id
   ↓
2. Check if file is indexed
   ├── YES → Use Vector Search
   └── NO → Use Full Text (fallback)
   ↓
3. Pinecone Search (if indexed):
   - Embed question → vector
   - Search Pinecone → Find top-k similar chunks
   - Retrieve: most relevant chunks (~2k characters total)
   ↓
4. Build Prompt:
   - Context: Retrieved chunks (or full text)
   - Question: User's question
   ↓
5. Send to Gemini LLM
   ↓
6. Return HTML response with clickable links
```

## 📦 STORAGE LOCATIONS

| Item | Location | Purpose |
|------|----------|---------|
| **Original File** | `backend/uploads/{uuid}_filename` | Original file storage |
| **File Metadata** | PostgreSQL `uploaded_files` table | File tracking, full text |
| **Chunk Embeddings** | Pinecone index per file (`kb-file-...`) | Vector search |

## 🔄 KEY DIFFERENCES

**OLD (Before Pinecone):**
- Query → Send entire file text to Gemini (5000+ words)
- High token usage, slow, irrelevant context

**NEW (With Pinecone):**
- Query → Send only Pinecone's top relevant chunks to Gemini (~2k characters)
- Lower token usage, faster, more relevant context

## 💡 EXAMPLE

**Upload:**
- File: `playbook.docx` (5000 words)
- Saved to: `uploads/abc123_playbook.docx`
- Extracted text stored in PostgreSQL
- Chunked into: 30 chunks
- 30 embeddings stored in Pinecone

**Query:**
- Question: "What are planning steps?"
- Pinecone search finds: Chunks 2, 5, 8 (most relevant)
- Send only these chunks to Gemini (not full 5000 words)
- Gemini answers based on relevant context

