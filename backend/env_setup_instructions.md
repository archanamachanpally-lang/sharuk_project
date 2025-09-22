# Environment Setup Instructions

## Google OAuth Configuration

To fix the Google authentication, you need to create a `.env` file in the `backend` directory with the following variables:

### 1. Create `.env` file in `backend/` directory:

```bash
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sprint_planning_db

# Security
SECRET_KEY=your-secret-key-here-change-in-production

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://192.168.11.101:3000

# Environment
ENVIRONMENT=development

# Gemini API
GEMINI_API_KEY=your-gemini-api-key-here

# Google OAuth Configuration (REQUIRED for Google Login)
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

### 2. Get Google OAuth Credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set Application Type to "Web application"
6. Add Authorized redirect URIs: `http://localhost:3000/auth/google/callback`
7. Copy the Client ID and Client Secret

### 3. Update your `.env` file with real values:

```bash
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-actual-secret-here
```

### 4. Restart your backend server after creating the `.env` file

## Current Status

- ✅ Backend error handling improved
- ✅ Frontend error display fixed
- ✅ Google OAuth flow properly configured
- ⏳ Waiting for environment variables to be set

Once you create the `.env` file with proper Google OAuth credentials, the login should work as it did initially!
