import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import HomePage from './components/HomePage';
import SprintPlanningPage from './components/SprintPlanningPage';
import SprintSummaryPage from './components/SprintSummaryPage';
import SprintResultsPage from './components/SprintResultsPage';
import ExistingPlansPage from './components/ExistingPlansPage';
import ExistingRiskAssessmentsPage from './components/ExistingRiskAssessmentsPage';
import WeeklyStatusReportPage from './components/WeeklyStatusReportPage';
import RiskAssessmentPage from './components/RiskAssessmentPage';
import RiskResultsPage from './components/RiskResultsPage';
import FeedbackPage from './components/FeedbackPage';
import ProjectsPage from './components/ProjectsPage';
import GoogleCallback from './components/GoogleCallback';
import { AuthProvider } from './contexts/AuthContext';
import './App.css';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          fontFamily: 'Arial, sans-serif',
          backgroundColor: '#f8f9fa',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <h1 style={{ color: '#dc3545', marginBottom: '20px' }}>Something went wrong</h1>
          <p style={{ color: '#6c757d', marginBottom: '30px' }}>
            We're sorry, but something unexpected happened. Please try refreshing the page.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Refresh Page
          </button>
          <details style={{ marginTop: '20px', textAlign: 'left', maxWidth: '600px' }}>
            <summary style={{ cursor: 'pointer', color: '#6c757d' }}>Error Details</summary>
            <pre style={{ 
              backgroundColor: '#f8f9fa', 
              padding: '10px', 
              borderRadius: '5px',
              overflow: 'auto',
              fontSize: '12px',
              color: '#dc3545'
            }}>
              {this.state.error && this.state.error.toString()}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className="App">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/callback" element={<GoogleCallback />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/sprint-planning" element={<SprintPlanningPage />} />
            <Route path="/sprint-summary" element={<SprintSummaryPage />} />
            <Route path="/sprint-results" element={<SprintResultsPage />} />
            <Route path="/existing-plans" element={<ExistingPlansPage />} />
            <Route path="/existing-risk-assessments" element={<ExistingRiskAssessmentsPage />} />
            <Route path="/weekly-status-report" element={<WeeklyStatusReportPage />} />
            <Route path="/risk-assessment" element={<RiskAssessmentPage />} />
            <Route path="/risk-results" element={<RiskResultsPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App; 