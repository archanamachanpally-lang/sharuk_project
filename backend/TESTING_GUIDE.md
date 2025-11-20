# Pinecone Integration Testing Guide

## Quick Start Commands

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```
> First run downloads the embedding model (~90 MB).

### 2. Run Database Migration (if needed)
```bash
python add_indexing_status_column.py
```

### 3. Start FastAPI Server
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Upload a Test File
```bash
curl -X POST "http://localhost:8000/api/upload-file" \
  -F "file=@/path/to/test.pdf" \
  -F "uploaded_by=test@example.com"
```
Expected response: `"indexing_status": "pending_index"` (background task kicks in).

### 5. Watch Backend Logs
Look for messages such as:
```
🌲 [PINECONE] Indexing mandatory file...
✅ [BACKGROUND INDEX] File 123 indexed successfully in Pinecone...
```

### 6. Query the File
```bash
curl -X POST "http://localhost:8000/api/ask-question" \
  -F "question=What is this document about?" \
  -F "file_id=123"
```
Expected: Gemini answer referencing Pinecone chunks.

### 7. Verify in Pinecone Console (optional)
- Confirm new index `kb-file-123-...` exists
- Check vector count > 0

### 8. Knowledge Base Test (Mandatory Files)
1. Toggle "Use for Project" on a mandatory file in the UI  
2. Watch logs for indexing success  
3. Ask a question without selecting any uploaded files  
4. Confirm the response references knowledge base content

## Manual Regression Checklist

1. Upload multiple files (PDF/DOCX/XLSX) and ensure each indexes without errors  
2. Ask questions against uploaded files (`file_id`)  
3. Ask questions with no file context to hit knowledge base search  
4. Inspect Pinecone console for indexes matching uploaded + mandatory files  
5. Toggle mandatory file selection off/on and confirm indexes are created or deleted

## Troubleshooting Quick Fixes

- **Issue: Pinecone index missing**
  - Confirm `PINECONE_API_KEY` / `PINECONE_HOST` in `backend/.env`
  - Re-upload the file or rerun `/api/project-knowledge-base/reindex-all` for mandatory files
  - Check backend logs for detailed error stack

- **Issue: Query returns empty context**
  - Verify the file's `indexing_status` is `"indexed"`
  - Confirm chunks exist in Pinecone console
  - Try a more specific question (similarity is semantic)

- **Issue: Embedding model download fails**
  - Check internet connection and disk space (~500 MB)
  - Manual fetch: `python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"`  

## Expected Behavior

- ✅ Upload response returns immediately while background task indexes in Pinecone  
- ✅ Backend logs show success message once indexing completes  
- ✅ Queries use Pinecone vectors when `indexing_status = "indexed"`  
- ✅ Knowledge base questions search multiple Pinecone indexes  
- ✅ Fallback gracefully uses full text if index is unavailable

## Performance Notes

- First embedding call loads the model (slightly slower); subsequent calls are fast  
- Pinecone upsert time scales with document size (≈1–2 s per 10k characters)  
- Query latency is typically < 500 ms for top-5 chunks  
- Character-based chunking (400/100 overlap) balances context quality and token usage
