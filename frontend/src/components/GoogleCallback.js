import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './GoogleCallback.css';

const GoogleCallback = () => {
  const [error, setError] = useState('');
  const { setUser, setSessionId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleGoogleCallback = async () => {
      try {
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

        const response = await axios.post('/api/auth/google/callback', { code });

        if (response.data.success) {
          setUser(response.data.user);
          setSessionId(response.data.session_id);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          localStorage.setItem('sessionId', response.data.session_id);
          navigate('/home');
        } else {
          setError(response.data.message || 'Authentication failed.');
        }
      } catch (error) {
        console.error('Google callback error:', error);
        setError('Authentication failed. Please try again.');
      }
    };

    handleGoogleCallback();
  }, [location, navigate, setUser, setSessionId]);

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
