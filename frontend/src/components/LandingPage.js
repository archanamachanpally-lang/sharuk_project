import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './LandingPage.css';

const LandingPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { loginWithGoogle } = useAuth();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await loginWithGoogle();
      
      if (result && result.success === false) {
        setError(result.message || 'Google OAuth failed. Please try again.');
      }
      // If successful, the user will be redirected to Google OAuth
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-page">
      <div className="container">
        <div className="card landing-card">
          <div className="text-center">
            <h1 className="landing-title">PM Portal</h1>
            
            <div className="login-section">
              <button
                className="btn google-login-btn"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                {loading ? (
                  <span>Logging in...</span>
                ) : (
                  <>
                    <span className="google-icon">🔐</span>
                    Login with Google (Demo)
                  </>
                )}
              </button>
              
              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage; 