import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './HomePage.css';

const HomePage = () => {
  const [selectedFeature, setSelectedFeature] = useState('');
  const [showStartButton, setShowStartButton] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleFeatureChange = (event) => {
    const value = event.target.value;
    setSelectedFeature(value);
    setShowStartButton(value === 'sprint');
  };

  const handleStartPlanning = () => {
    navigate('/sprint-planning');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="home-page">
      <div className="container">
        <div className="header">
          <div className="welcome-section">
            <h1>Hi {user?.name || 'User'}, welcome to PM Portal</h1>
            <p>Choose a feature to get started with your project planning</p>
          </div>
          <button className="btn btn-secondary logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>

        <div className="card main-content">
          <div className="text-center">
            <h2 className="section-title">Select a Feature</h2>
            <p className="section-description">
              Choose from the available features to begin your planning session
            </p>

            <div className="feature-selector">
              <select
                className="select-control"
                value={selectedFeature}
                onChange={handleFeatureChange}
              >
                <option value="">Select a feature...</option>
                <option value="sprint">Sprint Planning</option>
                <option value="rpx">RPX (Coming Soon)</option>
                <option value="feature1">Feature 1 (Coming Soon)</option>
                <option value="feature2">Feature 2 (Coming Soon)</option>
                <option value="feature3">Feature 3 (Coming Soon)</option>
              </select>
            </div>

            {showStartButton && (
              <div className="start-section">
                <button
                  className="btn btn-success start-planning-btn"
                  onClick={handleStartPlanning}
                >
                  🚀 Start Planning
                </button>
                <p className="feature-description">
                  Begin your AI-powered sprint planning session with interactive chat
                </p>
              </div>
            )}

            {selectedFeature && !showStartButton && (
              <div className="coming-soon">
                <p>🚧 This feature is coming soon!</p>
                <p>Please select "Sprint Planning" to try the demo.</p>
              </div>
            )}
          </div>
        </div>

        <div className="card info-card">
          <h3>About Sprint Planning</h3>
          <ul className="feature-list">
            <li>🤖 AI-powered interactive chat</li>
            <li>💬 Dynamic question generation</li>
            <li>📊 Intelligent summarization</li>
            <li>🎯 Context-aware responses</li>
            <li>📋 Comprehensive sprint plans</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HomePage; 