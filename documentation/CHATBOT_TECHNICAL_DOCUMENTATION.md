# Chatbot Technical Documentation

## Overview

This document provides technical implementation details for the PM Assistant Chatbot system, including architecture, APIs, database schema, and code structure.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [API Endpoints](#api-endpoints)
3. [Database Schema](#database-schema)
4. [Frontend Implementation](#frontend-implementation)
5. [Backend Implementation](#backend-implementation)
6. [Vector Search Integration](#vector-search-integration)
7. [LLM Integration](#llm-integration)
8. [File Processing Pipeline](#file-processing-pipeline)
9. [Error Handling](#error-handling)
10. [Performance Considerations](#performance-considerations)

---

## System Architecture

### High-Level Architecture

```
┌─────────────────┐
│   React Frontend │
│   (HomePage.js)  │
└────────┬─────────┘
         │
         │ HTTP/REST
         │
┌────────▼─────────┐
│  FastAPI Backend │
│    (main.py)     │
└────────┬─────────┘
         │
    ┌────┴────┬──────────────┬─────────────┐
    │         │              │             │
┌───▼───┐ ┌──▼────┐    ┌─────▼─────┐ ┌────▼────┐
│PostgreSQL│ │Pinecone│    │  Gemini AI │ │File System│
│ Database │ │Vector DB│    │   Service  │ │ (Optional)│
└─────────┘ └────────┘    └───────────┘ └──────────┘
```

### Component Interaction Flow

```
User Question
    │
    ▼
Frontend (HomePage.js)
    │
    ├─► Determine file source (uploaded/mandatory/knowledge base)
    │
    ├─► Build FormData with question + file context
    │
    ▼
POST /api/ask-question
    │
    ├─► Save user message to database
    │
    ├─► Determine context source:
    │   ├─► file_id → Pinecone vector search
    │   ├─► file_context → Direct text context
    │   └─► None → Search knowledge base indexes
    │
    ├─► Retrieve relevant chunks
    │
    ├─► Build prompt with context
    │
    ├─► Call Gemini AI service
    │
    ├─► Format response as HTML
    │
    ├─► Save bot message to database
    │
    ▼
Return JSON response
    │
    ▼
Frontend displays formatted response
```

---

## API Endpoints

### 1. File Upload Endpoint

**Endpoint**: `POST /api/upload-file`

**Purpose**: Upload one or multiple files for chatbot analysis

**Request**:
```javascript
FormData:
  - files: File[] (multiple files, up to 10)
  - uploaded_by: string (user email, optional)
```

**Response**:
```json
{
  "success": true,
  "files": [
    {
      "id": 123,
      "file_name": "document.pdf",
      "file_type": "pdf",
      "file_size": 1024000,
      "uploaded_by": "user@example.com",
      "status": "Uploaded",
      "indexing_status": "pending_index"
    }
  ]
}
```

**Process Flow**:
1. Validate file types
2. Save files to disk (`backend/uploads/`)
3. Extract text content
4. Save metadata to `uploaded_files` table
5. Trigger background indexing task
6. Return file metadata

**Background Indexing**:
- Chunks text into segments (500-1000 chars)
- Generates embeddings for each chunk
- Creates Pinecone index: `file-{id}-{sanitized-name}`
- Stores chunks in Pinecone
- Updates `indexing_status` to "indexed"

### 2. Question Answering Endpoint

**Endpoint**: `POST /api/ask-question`

**Purpose**: Answer user questions using document context

**Request**:
```javascript
FormData:
  - question: string (required)
  - file_id: int (optional) - For uploaded files
  - file_context: string (optional) - For mandatory files
  - mandatory_file_ids: string (optional) - JSON array of file IDs
  - chat_id: string (optional) - Chat session ID
  - user_email: string (optional) - User identifier
```

**Response**:
```json
{
  "success": true,
  "response": "<h3>Answer</h3><p>Based on the document...</p>",
  "chat_id": "uuid-string",
  "context_used": "file-123-document.pdf",
  "chunks_retrieved": 3
}
```

**Processing Logic**:

**Priority 1: file_context (Mandatory Files)**
```python
if file_context:
    # Use provided text directly
    context_text = file_context
    # No vector search needed
```

**Priority 2: file_id (Uploaded Files)**
```python
if file_id:
    file = db.query(UploadedFile).filter(id == file_id).first()
    
    if file.indexing_status == "indexed":
        # Use Pinecone vector search
        query_embedding = embedding_service.embed_query(question)
        results = pinecone_service.search_across_indexes(
            query_embedding=query_embedding,
            index_names=[f"file-{file_id}-{file_name}"],
            top_k=5
        )
        context_text = combine_chunks(results)
    else:
        # Fallback to full text
        context_text = file.extracted_text
```

**Priority 3: Knowledge Base Search**
```python
if not file_id and not file_context:
    # Search across all knowledge base files
    kb_files = get_knowledge_base_files(user_email)
    index_names = [get_index_name(f) for f in kb_files]
    
    query_embedding = embedding_service.embed_query(question)
    results = pinecone_service.search_across_indexes(
        query_embedding=query_embedding,
        index_names=index_names,
        top_k=3
    )
    context_text = combine_chunks(results)
```

### 3. Mandatory Files Endpoints

**Get Files**: `GET /api/mandatory-files`
- Returns list of all active mandatory files
- Optional: `?include_content=true` to include extracted text

**Upload File**: `POST /api/mandatory-files/upload`
- Admin only
- Stores file in database (BYTEA column)
- Extracts text content
- Returns file metadata

**Download File**: `GET /api/mandatory-files/{file_id}/download`
- Serves file from database
- Fallback to file system for legacy files
- Sets proper Content-Disposition header

**Delete File**: `DELETE /api/mandatory-files/{file_id}`
- Admin only
- Soft delete (sets is_active = false)
- Removes from knowledge base links

### 4. Chat Management Endpoints

**Get Chat Sessions**: `GET /api/chat/sessions?user_email={email}`
- Returns all chat sessions for user
- Includes first message preview
- Sorted by updated_at

**Create Chat**: `POST /api/chat/create`
- Creates new chat session
- Returns chat_id

**Save Message**: `POST /api/chat/message` (internal)
- Saves individual message to database
- Updates conversation JSON

---

## Database Schema

### Uploaded Files Table

```sql
CREATE TABLE uploaded_files (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR NOT NULL,
    file_type VARCHAR NOT NULL,
    file_path VARCHAR NOT NULL,
    uploaded_by VARCHAR,
    upload_time TIMESTAMP DEFAULT NOW(),
    status VARCHAR DEFAULT 'Uploaded',
    extracted_text TEXT,
    indexing_status VARCHAR DEFAULT 'pending_index'
);
```

**Fields**:
- `id`: Auto-increment primary key
- `file_name`: Original filename
- `file_type`: File extension (pdf, docx, etc.)
- `file_path`: Path to file on disk
- `uploaded_by`: User email
- `extracted_text`: Full text content
- `indexing_status`: `pending_index`, `indexed`, `error`

### Mandatory Files Table

```sql
CREATE TABLE mandatory_files (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR NOT NULL,
    file_type VARCHAR NOT NULL,
    file_path VARCHAR,  -- Nullable (legacy)
    file_content BYTEA,  -- File content in database
    file_size INTEGER,
    uploaded_by VARCHAR,
    uploaded_at TIMESTAMP DEFAULT NOW(),
    description VARCHAR,
    is_active BOOLEAN DEFAULT TRUE,
    extracted_text TEXT
);
```

**Fields**:
- `file_content`: Binary file data (BYTEA)
- `file_path`: Legacy field (nullable)
- `is_active`: Soft delete flag

### Project Knowledge Base Files Table

```sql
CREATE TABLE project_knowledge_base_files (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR NOT NULL,
    mandatory_file_id INTEGER REFERENCES mandatory_files(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_email, mandatory_file_id)
);
```

**Purpose**: Links users to their selected knowledge base files

### Chat Messages Table

```sql
CREATE TABLE chat_messages (
    id VARCHAR PRIMARY KEY,
    chat_id VARCHAR NOT NULL,
    user_email VARCHAR,
    role VARCHAR NOT NULL,  -- 'user' or 'assistant'
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Conversations Table

```sql
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    conversation_id VARCHAR UNIQUE NOT NULL,
    chat_id VARCHAR NOT NULL,
    user_email VARCHAR,
    project_id VARCHAR,  -- Foreign key to projects
    conversation_json JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Frontend Implementation

### Component Structure

**Main Component**: `HomePage.js`

**Key State Variables**:
```javascript
const [chatMessages, setChatMessages] = useState([]);
const [chatId, setChatId] = useState(null);
const [uploadedFileId, setUploadedFileId] = useState(null);
const [uploadedFileIds, setUploadedFileIds] = useState([]);
const [playbookFileIds, setPlaybookFileIds] = useState([]);
const [mandatoryFiles, setMandatoryFiles] = useState([]);
const [filesMarkedForProject, setFilesMarkedForProject] = useState(new Set());
```

### Question Handling Logic

**Function**: `addMessageWithBotResponse(userText)`

**Priority Order**:
1. **Uploaded Files** (`uploadedFileId` or `uploadedFileIds`)
   ```javascript
   if (uploadedFileId || uploadedFileIds.length > 0) {
       formData.append('file_id', fileIdToUse);
       // Uses Pinecone search
   }
   ```

2. **Playbook Files** (`playbookFileIds`)
   ```javascript
   else if (playbookFileIds.length > 0) {
       // Fetch files with extracted text
       const files = await fetch('/api/mandatory-files?include_content=true');
       const combinedContext = combineFileTexts(files);
       formData.append('file_context', combinedContext);
       formData.append('mandatory_file_ids', JSON.stringify(playbookFileIds));
   }
   ```

3. **Knowledge Base Files** (`filesMarkedForProject`)
   ```javascript
   else if (filesMarkedForProject.size > 0) {
       // Similar to playbook, uses knowledge base files
   }
   ```

4. **Predefined Responses**
   ```javascript
   else {
       // Use getBotResponse() for general questions
   }
   ```

### Message Formatting

**Function**: `formatBotResponse(text)`

**Process**:
1. Convert markdown to HTML
2. Make URLs clickable
3. Convert newlines to `<br/>`
4. Preserve code blocks
5. Format lists and headings

### Chat Session Management

**Chat ID Generation**:
```javascript
const createChatId = () => {
    return `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const ensureChatId = () => {
    if (!chatId) {
        const newId = createChatId();
        setChatId(newId);
        localStorage.setItem('chatId', newId);
        return newId;
    }
    return chatId;
};
```

**Session Persistence**:
- Chat ID stored in localStorage
- Messages saved to database in real-time
- Conversation JSON updated on each message

---

## Backend Implementation

### Question Processing Function

**Location**: `backend/main.py` - `ask_chatbot_question()`

**Key Steps**:

1. **Save User Message**
```python
_save_chat_message(db, chat_id, "user", question, user_email)
```

2. **Determine Context Source**
```python
if file_context:
    context_text = file_context
elif file_id:
    # Vector search or full text
    context_text = get_file_context(file_id, question)
else:
    # Knowledge base search
    context_text = search_knowledge_base(question, user_email)
```

3. **Build Prompt**
```python
system_prompt = _get_structured_html_system_prompt()
user_prompt = f"""
Based on the following document context, answer the user's question.

Context:
{context_text}

Question: {question}

Provide a clear, structured answer in HTML format.
"""
```

4. **Call Gemini AI**
```python
response = gemini_service.generate_response(
    system_prompt=system_prompt,
    user_prompt=user_prompt
)
```

5. **Save Bot Message**
```python
_save_chat_message(db, chat_id, "assistant", response, user_email)
```

### Vector Search Implementation

**Service**: `services/pinecone_service.py`

**Index Naming**:
```python
def get_index_name_for_file(file_id: int, file_name: str) -> str:
    sanitized = sanitize_filename(file_name)
    return f"file-{file_id}-{sanitized}"
```

**Search Process**:
```python
def search_across_indexes(
    query_embedding: List[float],
    index_names: List[str],
    top_k: int = 3
) -> Dict[str, Any]:
    all_results = []
    
    for index_name in index_names:
        index = client.Index(index_name)
        results = index.query(
            vector=query_embedding,
            top_k=top_k,
            include_metadata=True
        )
        
        for match in results.get("matches", []):
            all_results.append({
                "index_name": index_name,
                "score": match.get("score", 0.0),
                "text": match.get("metadata", {}).get("text", "")
            })
    
    # Sort by score (descending)
    all_results.sort(key=lambda x: x["score"], reverse=True)
    return {"success": True, "results": all_results}
```

### Embedding Service

**Service**: `services/embedding_service.py`

**Query Embedding**:
```python
def embed_query(text: str) -> List[float]:
    # Uses sentence-transformers or similar
    # Returns 384-dimensional vector
    model = load_model()
    embedding = model.encode(text)
    return embedding.tolist()
```

**Chunk Embedding**:
```python
def embed(texts: List[str]) -> List[List[float]]:
    # Batch embedding for multiple chunks
    model = load_model()
    embeddings = model.encode(texts)
    return embeddings.tolist()
```

---

## Vector Search Integration

### Pinecone Configuration

**Index Specifications**:
- **Dimension**: 384 (embedding vector size)
- **Metric**: Cosine similarity
- **Index Type**: Per-file indexes
- **Namespace**: Not used (single namespace per index)

**Index Creation**:
```python
def create_index_for_file(file_id: int, file_name: str) -> bool:
    index_name = get_index_name_for_file(file_id, file_name)
    
    if index_exists(index_name):
        return True
    
    client.create_index(
        name=index_name,
        dimension=384,
        metric="cosine"
    )
    return True
```

**Chunk Indexing**:
```python
def index_file_chunks(
    file_id: int,
    file_name: str,
    chunks: List[Dict],
    embeddings: List[List[float]]
) -> Dict[str, Any]:
    index_name = get_index_name_for_file(file_id, file_name)
    index = client.Index(index_name)
    
    vectors = []
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        vectors.append({
            "id": f"chunk-{i}",
            "values": embedding,
            "metadata": {
                "text": chunk["text"],
                "chunk_index": i,
                "file_id": file_id,
                "file_name": file_name
            }
        })
    
    index.upsert(vectors=vectors)
    return {"success": True, "chunks_indexed": len(vectors)}
```

### Chunking Strategy

**Service**: `services/chunking_service.py`

**Chunk Size**:
- **Default**: 500-1000 characters
- **Overlap**: 100-200 characters between chunks
- **Method**: Sentence-aware chunking

**Chunking Process**:
```python
def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> List[Dict]:
    chunks = []
    
    # Split by sentences first
    sentences = split_into_sentences(text)
    
    current_chunk = ""
    chunk_index = 0
    
    for sentence in sentences:
        if len(current_chunk) + len(sentence) > chunk_size:
            if current_chunk:
                chunks.append({
                    "text": current_chunk.strip(),
                    "chunk_index": chunk_index
                })
                chunk_index += 1
                # Keep overlap
                current_chunk = current_chunk[-overlap:] + " " + sentence
            else:
                current_chunk = sentence
        else:
            current_chunk += " " + sentence
    
    if current_chunk:
        chunks.append({
            "text": current_chunk.strip(),
            "chunk_index": chunk_index
        })
    
    return chunks
```

---

## LLM Integration

### Gemini Service

**Service**: `services/gemini_service.py`

**Configuration**:
- **API Keys**: Multiple keys for fallback
- **Model**: Gemini Pro or similar
- **Temperature**: Configurable
- **Max Tokens**: Configurable

**Response Generation**:
```python
def generate_response(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.7
) -> str:
    try:
        client = get_gemini_client()
        
        response = client.generate_content(
            contents=[
                {"role": "user", "parts": [{"text": system_prompt}]},
                {"role": "user", "parts": [{"text": user_prompt}]}
            ],
            generation_config={
                "temperature": temperature,
                "max_output_tokens": 2048
            }
        )
        
        return response.text
    except Exception as e:
        # Fallback to next API key
        return generate_response_with_fallback(...)
```

**System Prompt**:
```python
def _get_structured_html_system_prompt() -> str:
    return """
    You are a structured project assistant chatbot.
    
    Your goal is to provide clean, organized, and readable answers.
    
    Formatting rules:
    1. Use HTML structure for responses
    2. Headings → use <h3> or <h4> tags
    3. Lists → use <ul><li> for bullet points
    4. Links → make them clickable: <a href="URL" target="_blank">text</a>
    5. Avoid markdown formatting
    6. Keep responses concise and professional
    """
```

---

## File Processing Pipeline

### Text Extraction

**PDF Extraction**:
```python
def extract_text_from_pdf(file_content: bytes) -> Dict:
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(file_content)) as pdf:
            text = "\n".join([page.extract_text() for page in pdf.pages])
        return {"success": True, "text": text}
    except:
        # Fallback to PyPDF2
        import PyPDF2
        reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        text = "\n".join([page.extract_text() for page in reader.pages])
        return {"success": True, "text": text}
```

**DOCX Extraction**:
```python
def extract_text_from_docx(file_content: bytes) -> str:
    from docx import Document
    doc = Document(io.BytesIO(file_content))
    
    text_parts = []
    for paragraph in doc.paragraphs:
        if paragraph.text.strip():
            text_parts.append(paragraph.text.strip())
    
    # Also extract from tables
    for table in doc.tables:
        for row in table.rows:
            cells = [cell.text.strip() for cell in row.cells]
            if any(cells):
                text_parts.append(" | ".join(cells))
    
    return "\n".join(text_parts)
```

**XLSX Extraction**:
```python
def extract_text_from_xlsx(file_content: bytes) -> str:
    from openpyxl import load_workbook
    workbook = load_workbook(filename=io.BytesIO(file_content), data_only=True)
    
    lines = []
    for sheet in workbook.worksheets:
        lines.append(f"Sheet: {sheet.title}")
        for row in sheet.iter_rows(values_only=True):
            cells = [str(cell) for cell in row if cell is not None]
            if cells:
                lines.append("\t".join(cells))
    
    return "\n".join(lines)
```

### Background Indexing

**Task**: `background_tasks.add_task(index_file_in_pinecone, file_id)`

**Process**:
```python
async def index_file_in_pinecone(file_id: int, db: Session):
    file = db.query(UploadedFile).filter(id == file_id).first()
    
    if not file or not file.extracted_text:
        return
    
    # Chunk text
    chunks = chunking_service.chunk_text(file.extracted_text)
    
    # Generate embeddings
    embeddings = embedding_service.embed([chunk["text"] for chunk in chunks])
    
    # Create index
    pinecone_service.create_index_for_file(file_id, file.file_name)
    
    # Index chunks
    pinecone_service.index_file_chunks(
        file_id=file_id,
        file_name=file.file_name,
        chunks=chunks,
        embeddings=embeddings
    )
    
    # Update status
    file.indexing_status = "indexed"
    db.commit()
```

---

## Error Handling

### Frontend Error Handling

**Network Errors**:
```javascript
try {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    // Process data
} catch (error) {
    // Display user-friendly error
    setChatMessages(prev => [...prev, {
        text: `Sorry, there was an error: ${error.message}`,
        type: 'bot'
    }]);
}
```

**Validation**:
- Check file type before upload
- Validate question length
- Check for empty inputs

### Backend Error Handling

**Try-Catch Blocks**:
```python
try:
    # Process request
    result = process_question(question, context)
    return {"success": True, "response": result}
except FileNotFoundError:
    return {"success": False, "error": "File not found"}
except IndexingError:
    return {"success": False, "error": "File indexing failed"}
except Exception as e:
    logger.error(f"Unexpected error: {str(e)}")
    return {"success": False, "error": "Internal server error"}
```

**Database Rollback**:
```python
try:
    db.add(new_record)
    db.commit()
except Exception as e:
    db.rollback()
    raise e
```

---

## Performance Considerations

### Optimization Strategies

1. **Caching**:
   - Cache embeddings for common queries
   - Cache file metadata
   - Use Redis for session data (if implemented)

2. **Async Processing**:
   - File indexing in background
   - Non-blocking API calls
   - Parallel file processing

3. **Database Optimization**:
   - Indexes on frequently queried columns
   - Connection pooling
   - Query optimization

4. **Vector Search Optimization**:
   - Limit top_k results
   - Use approximate nearest neighbor search
   - Batch embedding generation

### Monitoring

**Key Metrics**:
- Response time for questions
- File indexing time
- Vector search latency
- Database query performance
- API error rates

**Logging**:
- Request/response logging
- Error logging with stack traces
- Performance metrics
- User activity logs

---

## Security Considerations

### Authentication
- User email from authenticated session
- Role-based access control
- Admin-only endpoints protected

### Data Privacy
- User-specific knowledge bases
- File access restricted by user
- Chat history per user

### Input Validation
- File type validation
- File size limits
- SQL injection prevention (SQLAlchemy ORM)
- XSS prevention (HTML sanitization)

---

## Deployment Notes

### Environment Variables

**Required**:
```bash
DATABASE_URL=postgresql://user:pass@host:5432/db
PINECONE_API_KEY=your-pinecone-key
GEMINI_API_KEY=your-gemini-key
CORS_ORIGINS=http://localhost:3000
```

**Optional**:
```bash
PINECONE_ENVIRONMENT=us-west1-gcp
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
MAX_FILE_SIZE=10485760  # 10MB
```

### Production Checklist

- [ ] Database migrations run
- [ ] Pinecone indexes created
- [ ] Environment variables set
- [ ] CORS configured
- [ ] File storage configured (database)
- [ ] Error logging enabled
- [ ] Monitoring set up
- [ ] Backup strategy in place

---

*Last Updated: November 2025*

