import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './WeeklyStatusReportPage.css';

const WeeklyStatusReportPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  return (
    <div className="weekly-status-report-page">
      <div className="container">
        <div className="header">
          <div className="welcome-section">
            <h1>Welcome to Weekly Status Report</h1>
            <p>Generate professional weekly status reports from your JIRA data</p>
          </div>
          <button className="btn btn-secondary back-btn" onClick={() => navigate('/home')}>
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeeklyStatusReportPage;
