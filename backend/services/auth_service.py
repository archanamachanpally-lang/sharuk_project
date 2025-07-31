from sqlalchemy.orm import Session
from models import User, Session as UserSession
from schemas import LoginRequest, LoginResponse
import uuid
from datetime import datetime, timedelta
import os
import requests

class AuthService:
    def __init__(self):
        self.secret_key = os.getenv("SECRET_KEY", "demo-secret-key")
        self.google_client_id = os.getenv("GOOGLE_CLIENT_ID")
        self.google_client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        self.google_redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    
    def get_google_auth_url(self) -> str:
        """Generate Google OAuth URL"""
        params = {
            'client_id': self.google_client_id,
            'redirect_uri': self.google_redirect_uri,
            'scope': 'openid email profile',
            'response_type': 'code',
            'access_type': 'offline'
        }
        
        auth_url = "https://accounts.google.com/o/oauth2/auth"
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{auth_url}?{query_string}"
    
    def exchange_code_for_token(self, code: str) -> dict:
        """Exchange authorization code for access token"""
        token_url = "https://oauth2.googleapis.com/token"
        data = {
            'client_id': self.google_client_id,
            'client_secret': self.google_client_secret,
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': self.google_redirect_uri
        }
        
        response = requests.post(token_url, data=data)
        return response.json()
    
    def get_user_info(self, access_token: str) -> dict:
        """Get user information from Google"""
        user_info_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        headers = {'Authorization': f'Bearer {access_token}'}
        
        response = requests.get(user_info_url, headers=headers)
        return response.json()
    
    def authenticate_user(self, code: str, db: Session) -> LoginResponse:
        """Authenticate user with Google OAuth"""
        try:
            # Exchange code for token
            token_data = self.exchange_code_for_token(code)
            if 'error' in token_data:
                return LoginResponse(
                    success=False,
                    session_id="",
                    user=None,
                    message=f"Token exchange failed: {token_data.get('error_description', 'Unknown error')}"
                )
            
            # Get user info from Google
            user_info = self.get_user_info(token_data['access_token'])
            
            # Check if user exists in database
            user = db.query(User).filter(User.google_id == user_info['id']).first()
            
            if not user:
                # Create new user
                user = User(
                    email=user_info['email'],
                    name=user_info['name'],
                    google_id=user_info['id']
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            
            # Create session
            session_id = f"session_{uuid.uuid4()}"
            session = UserSession(
                id=session_id,
                user_id=user.id,
                is_active=True,
                expires_at=datetime.now() + timedelta(hours=24)
            )
            db.add(session)
            db.commit()
            
            return LoginResponse(
                success=True,
                session_id=session_id,
                user={
                    "id": user.id,
                    "email": user.email,
                    "name": user.name,
                    "google_id": user.google_id
                },
                message="Login successful"
            )
            
        except Exception as e:
            return LoginResponse(
                success=False,
                session_id="",
                user=None,
                message=f"Authentication failed: {str(e)}"
            )
    
    def simulate_login(self, request: LoginRequest) -> LoginResponse:
        """Simulate Google OAuth login - creates a demo user and session"""
        try:
            # In a real implementation, this would validate Google OAuth tokens
            # For demo purposes, we'll create a mock user and session
            
            # Generate a demo user if email is provided
            user_data = {
                "id": 1,
                "email": request.email,
                "name": request.name or "Demo User",
                "google_id": request.google_id or f"google_{uuid.uuid4().hex[:8]}"
            }
            
            # Generate session ID
            session_id = str(uuid.uuid4())
            
            # In a real app, we'd save to database
            # For demo, we'll return the session data
            
            return LoginResponse(
                success=True,
                message="Login successful (demo mode)",
                session_id=session_id,
                user=user_data
            )
            
        except Exception as e:
            return LoginResponse(
                success=False,
                message=f"Login failed: {str(e)}",
                session_id=None,
                user=None
            )
    
    def simulate_logout(self) -> dict:
        """Simulate logout"""
        return {
            "success": True,
            "message": "Logout successful (demo mode)"
        }
    
    def validate_session(self, session_id: str) -> bool:
        """Validate if a session is active (demo implementation)"""
        # In a real app, this would check the database
        # For demo, we'll accept any non-empty session ID
        return bool(session_id and len(session_id) > 0)

auth_service = AuthService() 