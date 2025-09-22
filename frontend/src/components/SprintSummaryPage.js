import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './SprintSummaryPage.css';

const SprintSummaryPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { summary } = location.state || {};

  if (!summary) {
    return (
      <div className="summary-page">
        <div className="container">
          <h1>No Summary Found</h1>
          <p>Please go back and create a sprint plan first.</p>
          <button className="btn btn-primary" onClick={() => navigate('/home')}>
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Function to render markdown-like formatting
  const renderFormattedText = (text) => {
    if (!text) return '';
    
    return text
      .split('\n')
      .map((line, index) => {
        // Handle bold headers
        if (line.startsWith('**') && line.endsWith('**')) {
          return <h3 key={index} className="summary-header">{line.replace(/\*\*/g, '')}</h3>;
        }
        // Handle bullet points
        if (line.trim().startsWith('- ')) {
          return <li key={index} className="summary-bullet">{line.trim().substring(2)}</li>;
        }
        // Handle numbered lists
        if (line.trim().match(/^\d+\./)) {
          return <li key={index} className="summary-numbered">{line.trim()}</li>;
        }
        // Handle regular paragraphs
        if (line.trim()) {
          return <p key={index} className="summary-paragraph">{line}</p>;
        }
        // Handle empty lines
        return <br key={index} />;
      });
  };

  return (
    <div className="summary-page">
      <div className="container">
        <div className="header">
          <div className="header-content">
            <h1 className="summary-title">Your Sprint Plan Summary</h1>
            <p>AI-generated comprehensive sprint plan based on your inputs</p>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/home')}>
            ← Back to Home
          </button>
        </div>

        <div className="card summary-card">
          <h2 className="card-title">Generated Sprint Plan</h2>
          
          <div className="summary-content">
            {renderFormattedText(summary)}
          </div>

          <div className="actions">
            <button 
              className="btn btn-success" 
              onClick={() => navigate('/sprint-planning')}
            >
              Create New Plan
            </button>
            <button 
              className="btn btn-primary" 
              onClick={() => navigate('/home')}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SprintSummaryPage;
