# Chatbot Functional Documentation

## Overview

The PM Assistant Chatbot is an AI-powered conversational interface that helps users interact with project documents, mandatory files, and knowledge bases. It provides intelligent question-answering capabilities using vector search and LLM integration.

---

## Table of Contents

1. [Features](#features)
2. [User Interface](#user-interface)
3. [Core Functionalities](#core-functionalities)
4. [User Flows](#user-flows)
5. [File Management](#file-management)
6. [Knowledge Base Integration](#knowledge-base-integration)
7. [Role-Based Access](#role-based-access)

---

## Features

### 1. **Multi-Source Document Support**
- **Uploaded Files**: Users can upload PDF, DOCX, TXT, XLSX files directly to the chatbot
- **Mandatory Files**: Pre-configured files available to all users (stored in database)
- **Project Knowledge Base**: Files marked "Use for Project" that persist across sessions

### 2. **Intelligent Question Answering**
- **Vector Search**: Uses Pinecone for semantic search across document chunks
- **Context-Aware**: Retrieves relevant document sections based on question
- **Multi-Document**: Can search across multiple files simultaneously
- **Fallback Mechanisms**: Gracefully handles unindexed files

### 3. **Chat Management**
- **Chat Sessions**: Multiple conversation threads per user
- **Chat History**: Persistent conversation history with timestamps
- **Project-Based Chats**: Conversations can be associated with specific projects
- **Real-Time Saving**: Messages saved to database in real-time

### 4. **File Processing**
- **Text Extraction**: Automatically extracts text from various file formats
- **Vector Indexing**: Creates searchable vector embeddings for fast retrieval
- **Background Processing**: File indexing happens asynchronously
- **Status Tracking**: Shows indexing status (pending, indexed, error)

---

## User Interface

### Chat Interface Components

#### 1. **Chat Window**
- **Location**: Right side of the HomePage (can be expanded/fullscreen)
- **Features**:
  - Resizable and draggable
  - Collapsible sidebar for chat history
  - Fullscreen mode
  - Message input at bottom
  - File attachment button

#### 2. **Chat History Sidebar**
- **Features**:
  - Lists all chat sessions
  - Shows first message preview
  - Timestamp for each chat
  - Click to switch between chats
  - Collapsible/expandable

#### 3. **Message Display**
- **User Messages**: Right-aligned, blue background
- **Bot Messages**: Left-aligned, white/gray background
- **Formatting**: HTML rendering with clickable links
- **Timestamps**: Shows time for each message

#### 4. **File Attachment Menu**
- **Upload File**: Upload new files for chatbot analysis
- **Mandatory Files**: Access pre-configured mandatory files
- **Start a Project**: Initialize project with playbook files

---

## Core Functionalities

### 1. **File Upload**

**Purpose**: Allow users to upload documents for chatbot analysis

**Process**:
1. User clicks attachment icon
2. Selects file(s) from device (PDF, DOCX, TXT, XLSX)
3. File(s) uploaded to backend
4. Backend extracts text content
5. File indexed in Pinecone (background process)
6. File available for questioning

**Supported Formats**:
- PDF (`.pdf`)
- Word Documents (`.docx`, `.doc`)
- Text Files (`.txt`)
- Excel Files (`.xlsx`, `.xls`)
- PowerPoint (`.pptx`, `.ppt`)

**Limits**:
- Maximum 10 files per upload
- File size limits depend on server configuration

### 2. **Question Answering**

**Purpose**: Answer user questions based on uploaded or mandatory files

**Question Priority** (in order):
1. **Uploaded Files** (highest priority)
   - If user uploaded files, questions use those files
   - Uses Pinecone vector search if indexed
   - Falls back to full text if not indexed

2. **Project Knowledge Base Files**
   - Files marked "Use for Project" in Mandatory Files
   - Searches across all knowledge base files
   - Uses Pinecone vector search

3. **Mandatory Files (Playbook)**
   - Files selected when "Start a Project"
   - Uses direct text context (no vector search)
   - Multiple files can be combined

4. **Predefined Responses**
   - Fallback for general questions
   - No file context needed

**Answer Generation**:
- Uses Gemini AI for response generation
- Context includes relevant document chunks
- Responses formatted as HTML
- Links are clickable
- Structured with headings and lists

### 3. **Chat Session Management**

**Features**:
- **Auto-Create Sessions**: New chat created automatically
- **Session Persistence**: All chats saved to database
- **Session Switching**: Switch between multiple chats
- **Project Association**: Chats can be linked to projects
- **Message History**: Full conversation history preserved

**Chat ID Generation**:
- Unique UUID for each chat
- Persists across page refreshes
- Stored in localStorage

### 4. **Mandatory Files Management**

**Purpose**: Provide shared documents accessible to all users

**Admin Features** (role = 'admin' or admin email):
- **Upload Files**: Add new mandatory files
- **Delete Files**: Remove files from system
- **Module Assignment**: Assign files to modules (e.g., "PM Template")
- **Use for Project**: Mark files for project knowledge base
- **Refresh**: Reload file list

**User Features** (non-admin):
- **View Files**: See all available mandatory files
- **Download Files**: Download files to local device
- **Use in Chat**: Files automatically available for questioning

**File Storage**:
- Files stored in database (BYTEA column)
- No file system dependency
- Supports production deployment

---

## User Flows

### Flow 1: Upload File and Ask Questions

```
1. User opens chatbot
2. Clicks attachment icon
3. Selects file(s) to upload
4. File(s) uploaded and processed
5. User asks question: "What is the project timeline?"
6. System searches uploaded file(s) using vector search
7. Retrieves relevant chunks
8. Generates answer using Gemini AI
9. Displays formatted response
10. User can continue asking questions
```

### Flow 2: Start Project with Playbook

```
1. User clicks "Start a Project" button
2. Selects module (e.g., "PM Template")
3. System loads mandatory files for that module
4. User selects files to include in project
5. Clicks "Use for Project" checkbox
6. Files marked for project knowledge base
7. User asks question
8. System uses selected playbook files as context
9. Generates answer based on playbook content
10. Questions persist across sessions
```

### Flow 3: Use Mandatory Files Directly

```
1. User opens "Mandatory Files" dropdown
2. Views list of available files
3. Downloads file if needed
4. Asks question in chatbot
5. System automatically uses mandatory files if:
   - No uploaded files present
   - Files marked "Use for Project" exist
6. Searches across knowledge base files
7. Returns answer based on mandatory file content
```

### Flow 4: Multi-File Question Answering

```
1. User uploads multiple files OR selects multiple mandatory files
2. All files processed and indexed
3. User asks question
4. System searches across ALL files simultaneously
5. Retrieves top relevant chunks from each file
6. Combines context from multiple sources
7. Generates comprehensive answer
8. Response may reference multiple documents
```

---

## File Management

### File Upload Process

**Step 1: Frontend Upload**
- User selects file(s) via file input
- FormData created with file(s) and metadata
- POST request to `/api/upload-file`

**Step 2: Backend Processing**
- File saved to `backend/uploads/` directory
- Text extraction based on file type:
  - PDF: Uses pdfplumber or PyPDF2
  - DOCX: Uses python-docx
  - TXT: Direct UTF-8 decoding
  - XLSX: Uses openpyxl
- Extracted text saved to database

**Step 3: Vector Indexing** (Background)
- Text chunked into smaller segments
- Each chunk embedded using embedding service
- Chunks indexed in Pinecone
- Index name: `file-{file_id}-{sanitized_filename}`
- Status updated to "indexed"

### File Storage Architecture

**Uploaded Files**:
- Stored in: `backend/uploads/`
- Database: `uploaded_files` table
- Metadata: file_name, file_type, file_path, extracted_text, indexing_status

**Mandatory Files**:
- Stored in: Database (BYTEA column)
- Database: `mandatory_files` table
- Metadata: file_name, file_type, file_content, extracted_text, is_active

**Project Knowledge Base**:
- Links: `project_knowledge_base_files` table
- References: `mandatory_files` table
- User-specific: Each user has their own knowledge base

---

## Knowledge Base Integration

### Project Knowledge Base

**Purpose**: Provide persistent file context for project-related questions

**How It Works**:
1. User marks mandatory files as "Use for Project"
2. Files added to `project_knowledge_base_files` table
3. Files persist across chat sessions
4. Questions automatically use knowledge base files if:
   - No uploaded files present
   - Files are indexed in Pinecone

**Benefits**:
- No need to re-upload files for each session
- Consistent context across conversations
- Multi-user support (each user has own knowledge base)

### Vector Search Integration

**Pinecone Indexes**:
- One index per file: `file-{id}-{name}`
- Stores document chunks as vectors
- Enables semantic search

**Search Process**:
1. User question converted to embedding vector
2. Vector compared against all file indexes
3. Top-k most similar chunks retrieved
4. Chunks ranked by similarity score
5. Best chunks used as context for LLM

**Fallback Mechanisms**:
- If file not indexed: Uses full extracted text
- If no results: Returns error message
- If indexing fails: Still works with full text

---

## Role-Based Access

### Admin Users

**Identification**:
- Role check: `user.role === "admin"` OR
- Email check: Email in admin list (e.g., "shaik.sharuk@forsysinc.com")

**Mandatory Files Access**:
- ✅ Upload new files
- ✅ Delete files
- ✅ Assign modules
- ✅ Mark files for project
- ✅ Refresh file list
- ✅ Download files

### Regular Users

**Mandatory Files Access**:
- ✅ View all files
- ✅ Download files
- ✅ Use files in chatbot
- ❌ Upload files
- ❌ Delete files
- ❌ Manage modules

**Chatbot Access**:
- ✅ Upload files for analysis
- ✅ Ask questions
- ✅ Use mandatory files
- ✅ Create chat sessions
- ✅ Access chat history

---

## Error Handling

### Common Scenarios

**File Upload Errors**:
- Invalid file type → Error message displayed
- File too large → Server error returned
- Extraction failure → Warning logged, file still saved

**Question Answering Errors**:
- No files available → Suggests uploading files
- File not indexed → Uses full text fallback
- No relevant results → Returns "No relevant information found"
- API errors → Displays user-friendly error message

**Network Errors**:
- Connection timeout → Retry option
- Server error → Error message with details
- CORS issues → Check backend configuration

---

## User Experience Features

### 1. **Loading Indicators**
- Shows "Thinking..." message while processing
- File upload progress (if implemented)
- Indexing status indicators

### 2. **Message Formatting**
- HTML rendering for rich text
- Clickable links (open in new tab)
- Structured lists and headings
- Code blocks preserved

### 3. **Chat Interface**
- Auto-scroll to latest message
- Timestamp for each message
- Message type indicators (user/bot)
- Responsive design

### 4. **File Management UI**
- Drag-and-drop file upload (if implemented)
- File list with icons
- Download buttons
- Status indicators

---

## Integration Points

### 1. **Gemini AI Service**
- **Purpose**: Generate natural language responses
- **Input**: User question + document context
- **Output**: Formatted HTML response
- **Configuration**: API keys in environment variables

### 2. **Pinecone Vector Database**
- **Purpose**: Semantic search across documents
- **Indexes**: One per file
- **Embeddings**: 384-dimensional vectors
- **Search**: Cosine similarity

### 3. **PostgreSQL Database**
- **Tables Used**:
  - `uploaded_files`: User-uploaded files
  - `mandatory_files`: System files
  - `project_knowledge_base_files`: User knowledge base
  - `chat_messages`: Message history
  - `conversations`: Chat sessions

### 4. **Frontend State Management**
- React Context for authentication
- Local state for chat messages
- LocalStorage for chat IDs
- Session persistence

---

## Best Practices

### For Users

1. **File Upload**:
   - Upload files in supported formats
   - Wait for indexing to complete
   - Check file status before asking questions

2. **Question Asking**:
   - Be specific in questions
   - Reference document sections if needed
   - Use multiple questions for complex topics

3. **Knowledge Base**:
   - Mark frequently used files as "Use for Project"
   - Organize files by module
   - Keep knowledge base updated

### For Administrators

1. **File Management**:
   - Upload high-quality documents
   - Ensure proper text extraction
   - Monitor indexing status
   - Remove outdated files

2. **System Maintenance**:
   - Monitor Pinecone index health
   - Check database storage
   - Review error logs
   - Update mandatory files regularly

---

## Limitations

1. **File Size**: Large files may take time to process
2. **Indexing Time**: Vector indexing happens in background
3. **Context Length**: Very long documents may be truncated
4. **Language Support**: Primarily English
5. **File Formats**: Limited to supported formats
6. **Concurrent Users**: Performance depends on server capacity

---

## Future Enhancements

1. **Multi-Language Support**: Support for multiple languages
2. **File Versioning**: Track file versions and changes
3. **Advanced Search**: Full-text search with filters
4. **Export Conversations**: Download chat history
5. **File Sharing**: Share files between users
6. **Analytics**: Usage statistics and insights
7. **Custom Prompts**: User-defined system prompts
8. **Voice Input**: Speech-to-text for questions

---

## Support & Troubleshooting

### Common Issues

**Q: Files not appearing after upload**
- Check browser console for errors
- Verify backend server is running
- Check file format is supported

**Q: Questions returning no results**
- Ensure files are indexed (check status)
- Try re-uploading files
- Check if files have extracted text

**Q: Chat history not loading**
- Clear browser cache
- Check database connection
- Verify user authentication

**Q: Slow response times**
- Check Pinecone service status
- Verify network connection
- Large files may take longer

---

## Version History

- **v1.0**: Initial chatbot implementation
- **v1.1**: Added mandatory files support
- **v1.2**: Database storage for mandatory files
- **v1.3**: Role-based access control
- **v1.4**: Project knowledge base integration

---

*Last Updated: November 2025*

