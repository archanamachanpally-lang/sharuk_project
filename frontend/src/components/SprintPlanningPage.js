import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './SprintPlanningPage.css';

const SprintPlanningPage = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sprintSessionId, setSprintSessionId] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }

    // Start sprint planning session
    startSprintSession();
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const startSprintSession = async () => {
    try {
      setLoading(true);
      
      // Call the backend to start sprint session
      const response = await fetch('/api/sprint/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: 1,
          session_id: 'demo_session'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setSprintSessionId(data.sprint_session_id);
        
        // Add initial bot message
        setMessages([{
          id: 1,
          type: 'bot',
          content: 'Hello! I\'m here to help you plan your sprint. Let\'s start by getting to know your project better. What is your name?',
          timestamp: new Date().toISOString()
        }]);
      } else {
        setError('Failed to start sprint planning session: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error starting sprint session:', error);
      setError('Failed to start sprint planning session');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading || !sprintSessionId) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = inputMessage;
    setInputMessage('');
    setLoading(true);
    setError('');

    try {
      // Call the backend to get LLM response
      const response = await fetch('/api/sprint/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sprint_session_id: sprintSessionId,
          session_id: 'demo_session',
          message: currentMessage
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const botMessage = {
          id: Date.now() + 1,
          type: 'bot',
          content: data.response,
          timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, botMessage]);

        if (data.is_complete) {
          setIsComplete(true);
          generateSummary();
        }
      } else {
        setError('Failed to get response: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async () => {
    try {
      setLoading(true);
      
      // Call the backend to get GROQ summary
      const response = await fetch('/api/sprint/finish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sprint_session_id: sprintSessionId,
          session_id: 'demo_session'
        })
      });

      const data = await response.json();
      
             if (data.success) {
         // Ensure summary is a string
         let summaryText = data.summary;
         if (typeof summaryText === 'object') {
           summaryText = JSON.stringify(summaryText, null, 2);
         } else if (typeof summaryText !== 'string') {
           summaryText = String(summaryText);
         }
         setSummary(summaryText);
       } else {
         setError('Failed to generate summary: ' + (data.message || 'Unknown error'));
       }
    } catch (error) {
      console.error('Error generating summary:', error);
      setError('Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFinish = () => {
    setIsComplete(true);
    generateSummary();
  };

  const handleBackToHome = () => {
    navigate('/home');
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="sprint-planning-page">
      <div className="container">
        <div className="header">
          <div className="header-content">
            <h1>Sprint Planning</h1>
            <p>AI-powered interactive sprint planning session</p>
          </div>
          <button className="btn btn-secondary" onClick={handleBackToHome}>
            ← Back to Home
          </button>
        </div>

        <div className="card chat-card">
          <div className="chat-header">
            <h2>Planning Assistant</h2>
            <p>Answer the questions to create your sprint plan</p>
          </div>

          <div className="chat-container" ref={chatContainerRef}>
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.type}`}>
                <div className="message-content">{message.content}</div>
                <div className="message-timestamp">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="message bot">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="chat-input">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={loading || isComplete}
              className="form-control"
            />
            <button
              className="btn"
              onClick={sendMessage}
              disabled={loading || !inputMessage.trim() || isComplete}
            >
              Send
            </button>
            {!isComplete && (
              <button
                className="btn btn-success"
                onClick={handleFinish}
                disabled={loading}
              >
                Finish
              </button>
            )}
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>

        {summary && (
          <div className="card summary-card">
            <h3 className="summary-title">Sprint Plan Summary</h3>
            <div className="summary-content">
              <p>{summary}</p>
            </div>
            <div className="summary-actions">
              <button className="btn" onClick={handleBackToHome}>
                Back to Home
              </button>
              <button className="btn btn-secondary" onClick={() => window.print()}>
                Print Summary
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SprintPlanningPage; 