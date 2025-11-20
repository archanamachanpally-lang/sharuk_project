import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './GoogleCallback.css';

const GoogleCallback = () => {
  const [error, setError] = useState('');
  const { setUser, setSessionId, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleGoogleCallback = async () => {
      try {
        // If user is already authenticated, redirect to home
        if (isAuthenticated) {
          navigate('/home');
          return;
        }

        const urlParams = new URLSearchParams(location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');

        if (error) {
          setError('Google OAuth was cancelled or failed.');
          return;
        }

        if (!code) {
          setError('No authorization code received from Google.');
          return;
        }

        const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/google/callback`, { code });

        if (response.data.success) {
          // Clear any existing workspace selection on Google login
          localStorage.removeItem('selectedWorkspace');
          // Clear chatbot session flags to ensure it shows on new login
          sessionStorage.removeItem('hasShownFullscreenChat');
          sessionStorage.removeItem('lastShownFullscreenChatUserId');
          
          setUser(response.data.user);
          setSessionId(response.data.session_id);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          localStorage.setItem('sessionId', response.data.session_id);
          
          // Clear the URL parameters to prevent back button issues
          window.history.replaceState({}, document.title, '/callback');
          navigate('/home');
        } else {
          setError(response.data.message || 'Authentication failed.');
        }
      } catch (error) {
        console.error('Google callback error:', error);
        // Check if it's a token exchange error (expired code)
        if (error.response?.status === 400) {
          setError('Authentication session expired. Please try logging in again.');
        } else {
          setError('Authentication failed. Please try again.');
        }
      }
    };

    handleGoogleCallback();
  }, [location, navigate, setUser, setSessionId, isAuthenticated]);

  if (error) {
    return (
      <div className="callback-page">
        <div className="container">
          <div className="card">
            <div className="text-center">
              <div className="error-icon">❌</div>
              <h2>Authentication Failed</h2>
              <p className="error-message">{error}</p>
              <button className="btn" onClick={() => navigate('/')}>
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default GoogleCallback;
