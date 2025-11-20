# File Upload and Query Flow Documentation

## Overview

This document explains the complete flow of file upload, storage, indexing, and query retrieval in the PM Portal system.

---

## 📤 File Upload Flow

### Step 1: File Upload Request
**Endpoint:** `POST /api/upload-file`

**What happens:**
1. User uploads one or multiple files (PDF, DOCX, TXT, XLSX) through the frontend
2. **Single file:** Upload one file as before
3. **Multiple files:** Upload up to 10 files in a single request (array of files)
4. File(s) are received by FastAPI backend

### Step 2: File Storage on Disk
**Location:** `backend/uploads/` directory

**Process:**
- For each file, generate unique filename: `{uuid}_{original_filename}`
- Example: `9c3adea2-2d0c-4ffe-8bae-63741b07d83a_CDO Templates.xlsx`
- Save each file to disk: `backend/uploads/9c3adea2-2d0c-4ffe-8bae-63741b07d83a_CDO Templates.xlsx`
- Each file gets its own unique UUID

**Code:**
```python
upload_dir = Path("uploads")
unique_filename = f"{uuid.uuid4()}_{file.filename}"
file_path = upload_dir / unique_filename
# Save file to disk
with open(file_path, "wb") as f:
    f.write(file_content)
```

### Step 3: Text Extraction
**Extraction by file type:**
- **PDF:** Uses `pdfplumber` (primary) or `PyPDF2` (fallback)
- **DOCX:** Uses `python-docx` to extract plain text, then applies hardcoded playbook links mapping
- **TXT:** Direct UTF-8 decoding
- **XLSX:** Uses `openpyxl` to extract cell values row by row

**DOCX text extraction:**
- Extracts plain text from paragraphs and tables
- Applies hardcoded playbook links mapping (from `playbook_links_mapping.py`)
- Formats links as: `link_text (url)` when found in the mapping
- Example: `"Link to sample design document (https://docs.google.com/spreadsheets/...)"`

### Step 4: Save to PostgreSQL Database
**Table:** `uploaded_files`

**Stored data:**
- `id` (auto-increment)
- `file_name` (original filename)
- `file_type` (pdf, docx, txt, xlsx)
- `file_path` (disk path: `uploads/9c3adea2-..._filename.xlsx`)
- `uploaded_by` (user email)
- `upload_time` (timestamp)
- `status` ("Processed")
- `extracted_text` (full extracted text content)
- `indexing_status` ("pending_index" → "indexed" or "error")

**Code:**
```python
uploaded_file = UploadedFile(
    file_name=file.filename,
    file_type=file_extension,
    file_path=str(file_path),  # Disk path
    uploaded_by=user_email,
    status="Processed",
    extracted_text=extracted_text,  # Full text
    indexing_status="pending_index"
)
db.add(uploaded_file)
db.commit()
```

### Step 5: Index in Pinecone (Vector Store)
**Per-file index:** Each uploaded file receives its own Pinecone index named `kb-file-{file_id}-{sanitized_filename}`.

**Process:**
1. **Chunking:** Split extracted text into character-based chunks  
   - Default: 400 characters per chunk  
   - Overlap: 100 characters  
   - Example: 12 000-character document → ~25 chunks

2. **Embedding:** Generate vector embeddings for each chunk  
   - Uses `all-MiniLM-L6-v2` model (local, default)  
   - Produces 384-dimensional vectors

3. **Upsert to Pinecone:**  
   - Each chunk stored with:
     - `id`: `chunk_{file_id}_{index}`
     - `values`: embedding vector
     - `metadata`:
       ```json
       {
         "file_id": "123",
         "file_name": "Project Plan.docx",
         "chunk_index": "0",
         "text": "<chunk text (≤400 chars)>"
       }
       ```
   - Pinecone hosts the vectors; no local persistence directory is required.

4. **Update Database:**  
   - Set `indexing_status = "indexed"` when upsert succeeds  
   - If indexing fails: `indexing_status = "error"` (upload still succeeds)

**Code (simplified):**
```python
chunks = chunking_service.chunk_text_by_characters(text, chunk_size=400, chunk_overlap=100)
embeddings = embedding_service.embed([chunk["text"] for chunk in chunks])

pinecone_service.create_index_for_file(file_id, file_name)
pinecone_service.index_file_chunks(file_id=file_id, file_name=file_name, chunks=chunks, embeddings=embeddings)
```

---

## 🔍 Query Flow (When User Asks a Question)

### Step 1: Query Request
**Endpoint:** `POST /api/ask-question`

**Parameters:**
- `question`: User's question
- `file_id`: ID of the uploaded file (optional)
- `file_context`: Pre-extracted text (for mandatory files, optional)

### Step 2: Determine Context Source

**Option A: Using `file_id` (Chatbot Files)**
1. Check if file exists in database
2. Check `indexing_status`:
   - **If `indexed`:** Use Pinecone vector search (recommended)
   - **If `pending_index` or `error`:** Fallback to full extracted text

**Option B: Using `file_context` (Mandatory Files)**
- Use provided text directly (backward compatibility)
- No vector search needed

### Step 3: Vector Search (If File is Indexed)

**Process:**
1. **Embed Query:** Convert user question to vector
   ```python
   query_embedding = embedding_service.embed_query(question)
   # Returns: [0.123, -0.456, 0.789, ...] (384 numbers)
   ```

2. **Search Pinecone:**
   - Query the per-file index
   - Find top-k most similar chunks (default: k=5)
   - Uses cosine similarity (vector distance)
   
   ```python
   index_name = pinecone_service.get_index_name_for_file(file_id, file_name)
   results = pinecone_service.search_across_indexes(
       query_embedding=query_embedding,
       index_names=[index_name],
       top_k=5
   )["results"]
   ```

3. **Retrieve Chunks:**
   - Returns 3 most relevant chunks based on semantic similarity
   - Example chunks:
     ```
     [Chunk 5 from document.pdf]
     This section discusses project planning...
     
     [Chunk 12 from document.pdf]
     The risk assessment process involves...
     
     [Chunk 8 from document.pdf]
     Sprint planning requires...
     ```

### Step 4: Build Context for LLM

**If vector search used:**
- Combine retrieved chunks (top-3)
- Format: `[Chunk X from filename]\n{chunk_text}\n\n---\n\n[Chunk Y...]`
- Total context: ~900 words (300 words × 3 chunks)

**If fallback to full text:**
- Use entire `extracted_text` from database
- May be truncated if too long (8000 chars for single file)

**If file_context provided:**
- Use provided text directly

### Step 5: Send to Gemini LLM

**Prompt Structure:**
```
DOCUMENT CONTENT:
{retrieved_chunks or full_text}

USER QUESTION:
{user_question}

INSTRUCTIONS:
- Answer based on document content
- Include links as HTML: <a href="url" target="_blank">link_text</a>
- ...
```

**LLM Processing:**
- Gemini receives: User question + relevant chunks
- Generates answer based on retrieved context
- Preserves links in HTML format
- Returns structured HTML response

### Step 6: Return Response to Frontend
- Response includes Gemini-generated answer
- Links are clickable HTML (`<a>` tags)
- Frontend renders HTML using `dangerouslySetInnerHTML`
- Links open in new tabs (prevented React Router interception)

---

## 📦 Multiple File Upload Flow

### Batch Upload Process

When uploading multiple files (up to 10) in a single request:

1. **Validation:**
   - Maximum 10 files per request
   - Each file validated independently
   - Invalid files are skipped but don't block other files

2. **Parallel Processing:**
   - Each file processed independently using the same logic
   - Files are processed sequentially but indexing runs in parallel (background tasks)
   - Each file gets its own:
     - UUID filename
     - Database record in `uploaded_files` table
     - Background indexing task

3. **Response Format:**
   ```json
   {
     "success": true,
     "total_files": 3,
     "successful_uploads": 2,
     "failed_uploads": 1,
     "files": [
       {
         "success": true,
         "file_id": 123,
         "file_name": "document1.pdf",
         "file_type": "pdf",
         "indexing_status": "pending_index",
         "extracted_length": 5000,
         "message": "File uploaded and processed successfully..."
       },
       {
         "success": true,
         "file_id": 124,
         "file_name": "document2.docx",
         "file_type": "docx",
         "indexing_status": "pending_index",
         "extracted_length": 3000,
         "message": "File uploaded and processed successfully..."
       },
       {
         "success": false,
         "error": "Invalid file type...",
         "file_name": "invalid.txt"
       }
     ],
     "message": "Processed 3 file(s): 2 successful, 1 failed"
   }
   ```

4. **Unified Search:**
   - Each indexed file has its own Pinecone index (`kb-file-{file_id}-{name}`)
   - When querying, the backend can search a specific index (uploaded file) or multiple indexes (knowledge base / router fallback)
   - Vector search returns the highest-scoring chunks regardless of source file
   - Metadata still includes `file_id`, enabling per-file attribution

---

## 📊 Data Storage Summary

### Storage Locations

1. **Original Files (Disk):**
   - Path: `backend/uploads/{uuid}_{filename}`
   - Format: Binary (PDF, DOCX, XLSX, etc.)
   - Purpose: Original file storage

2. **PostgreSQL Database:**
   - Table: `uploaded_files`
   - Stores: Metadata + full extracted text
   - Purpose: File tracking + fallback retrieval

3. **Pinecone (Vector Store):**
   - Serverless index per file (hosted by Pinecone)
   - Stores: Chunk embeddings + metadata
   - Purpose: Semantic search across uploaded and knowledge base documents

### Storage Flow Diagram

```
File Upload
    ↓
[1] Save to Disk: backend/uploads/{uuid}_filename
    ↓
[2] Extract Text: Use pdf_service/docx_service/etc.
    ↓
[3] Save to PostgreSQL: uploaded_files table
    ├── file_path: "uploads/{uuid}_filename"
    ├── extracted_text: "Full text content..."
    └── indexing_status: "pending_index"
    ↓
[4] Index in Pinecone:
    ├── Chunk text (400 chars each, 100-char overlap)
    ├── Generate embeddings (384-dim vectors)
    └── Upsert to Pinecone index: kb-file-{file_id}-{name}
    ↓
[5] Update PostgreSQL: indexing_status = "indexed"
```

---

## 🔎 Query Flow Diagram

```
User Question
    ↓
[1] Check file_id or file_context
    ↓
[2] If file_id:
    ├── Check indexing_status
    │   ├── If "indexed": Use Vector Search
    │   └── If not indexed: Use Full Text (fallback)
    └── If file_context: Use provided text
    ↓
[3] Vector Search (if indexed):
    ├── Embed query: question → vector
    ├── Search Pinecone index(es): Find top-k similar chunks
    └── Retrieve: most relevant chunks with metadata
    ↓
[4] Build Prompt:
    ├── Context: Retrieved chunks (or full text)
    ├── Question: User's question
    └── Instructions: Include links, format HTML
    ↓
[5] Send to Gemini LLM
    ↓
[6] Return HTML response with clickable links
```

---

## 🔄 Key Differences: Old vs New Flow

### Old Flow (Before Pinecone)
1. Upload file → Extract text → Save to database
2. On query: Send **entire file text** to Gemini
3. Problem: High token usage, irrelevant context

### New Flow (With Pinecone)
1. Upload file → Extract text → Save to database → **Index in Pinecone**
2. On query: **Retrieve top relevant chunks from Pinecone** → Send to Gemini
3. Benefit: Lower token usage, more relevant context

---

## 📝 Example: Complete Flow

### Upload Example
```
User uploads: "Project Management Playbook.docx"
    ↓
1. Save to disk: uploads/a1b2c3d4_Project Management Playbook.docx
    ↓
2. Extract text: "Project Management Playbook... Link to standard documentation/templates..."
    ↓
3. Save to DB:
   - id: 123
   - file_path: "uploads/a1b2c3d4_Project Management Playbook.docx"
   - extracted_text: "Project Management Playbook..."
   - indexing_status: "pending_index"
    ↓
4. Chunk text: 30 chunks (400 characters each, 100-char overlap)
    ↓
5. Generate embeddings: 30 vectors (384-dim each)
    ↓
6. Store in Pinecone:
   - Index: `kb-file-123-project-management-playbook`
   - 30 chunks with metadata + embeddings
    ↓
7. Update DB: indexing_status = "indexed"
```

### Query Example
```
User asks: "What are the steps for project planning?"
    ↓
1. Check file_id: 123
2. Check indexing_status: "indexed" ✓
    ↓
3. Pinecone Search:
   - Embed query: "What are the steps for project planning?" → vector
   - Search Pinecone index: Retrieve top chunks mentioning "planning", "steps"
   - Retrieve:
     * Chunk 2: "Planning Phase: Review pre-sales content..."
     * Chunk 5: "Create Kickoff Deck. Structure discovery..."
     * Chunk 8: "Prepare detailed Project Plan..."
    ↓
4. Build prompt:
   DOCUMENT CONTENT:
   [Chunk 2 from Project Management Playbook.docx]
   Planning Phase: Review pre-sales content...
   
   [Chunk 5 from Project Management Playbook.docx]
   Create Kickoff Deck...
   
   USER QUESTION:
   What are the steps for project planning?
    ↓
5. Send to Gemini → Get answer
    ↓
6. Return: "Based on the playbook, the planning phase includes: 1. Review pre-sales content... <a href='...'>Link to Project Plan</a>"
```

---

## 🛠️ Troubleshooting

### Issue: File not indexed
**Check:**
- `indexing_status` in database
- Backend logs for `🌲 [PINECONE]` messages (successful vs failed)
- Pinecone console to confirm index exists (`kb-file-{file_id}-...`)

**Fix:**
- Re-upload the file (creates fresh index)
- For mandatory files, toggle "Use for Project" off/on to trigger reindexing

### Issue: No search results
**Possible causes:**
- File not indexed yet
- Query too vague or unrelated
- Pinecone index not ready

**Fix:**
- Wait for indexing to complete
- Try more specific query
- Confirm index appears in Pinecone console

### Issue: Links not showing
**Check:**
- File was uploaded after hyperlink extraction update
- Extracted text contains links in format: `link_text (url)`
- LLM prompt includes link preservation instructions

**Fix:**
- Re-upload file with new extraction
- Check `extracted_text` in database for link format

---

## 📍 Storage Locations Reference

| Storage Type | Location | Purpose |
|-------------|----------|---------|
| **Original Files** | `backend/uploads/` | Original file storage |
| **PostgreSQL** | Database server | Metadata + extracted text |
| **Pinecone** | Hosted by Pinecone | Vector embeddings + metadata |

---

## 🔐 Important Notes

1. **File Paths:** Files are stored on disk, paths are stored in database
2. **Text Extraction:** Happens once during upload, stored in database
3. **Vector Indexing:** Happens once during upload, stored in Pinecone
4. **Query Performance:** Vector search is fast (~100-500ms)
5. **Token Savings:** Instead of sending 5000 words, send only ~900 words (top-3 chunks)
6. **Fallback:** If indexing fails, system falls back to full text search

---

## 🧪 Testing the Flow

### Test Single File Upload
```bash
curl -X POST "http://localhost:8000/api/upload-file" \
  -F "file=@document.pdf" \
  -F "uploaded_by=test@example.com"
```

### Test Multiple File Upload (up to 10 files)
```bash
curl -X POST "http://localhost:8000/api/upload-file" \
  -F "files=@document1.pdf" \
  -F "files=@document2.docx" \
  -F "files=@document3.txt" \
  -F "uploaded_by=test@example.com"
```

**Note:** For multiple files, use the same field name `files` multiple times (one per file).

### Test Query
```bash
curl -X POST "http://localhost:8000/api/ask-question" \
  -F "question=What is this document about?" \
  -F "file_id=1"
```

### Check Indexing
- Watch backend logs for `✅ [BACKGROUND INDEX]` messages
- Visit Pinecone console to confirm new index `kb-file-{file_id}-...`

