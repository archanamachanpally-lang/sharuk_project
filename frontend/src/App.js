import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import HomePage from './components/HomePage';
import SprintPlanningPage from './components/SprintPlanningPage';
import GoogleCallback from './components/GoogleCallback';
import { AuthProvider } from './contexts/AuthContext';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/callback" element={<GoogleCallback />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/sprint-planning" element={<SprintPlanningPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App; 