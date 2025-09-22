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
        setLoading(false);
      }
      // If successful, loginWithGoogle will redirect to Google OAuth
      // Don't set loading to false here as we're redirecting
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="landing-page">
      <header className="top-bar">
        <img src="/forsys-logo.png" alt="Forsys Logo" className="forsys-logo" />
      </header>

      <div className="main-content">
        <h1 className="main-heading">Welcome to PM Portal</h1>
        <p className="sub-text">
          Engage, plan, and collaborate effectively with your team using the PM portal built for Forsys employees.
        </p>

        <button
          className="google-login-btn"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <img
            src="https://developers.google.com/identity/images/g-logo.png"
            alt="Google"
            className="google-icon-img"
          />
          {loading ? 'Logging in...' : 'Login with Google'}
        </button>

        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
};

export default LandingPage;