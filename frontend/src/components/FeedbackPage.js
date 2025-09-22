import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './FeedbackPage.css';

const FeedbackPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || user?.displayName || '',
    email: user?.email || '',
    sprintGoalsClarity: '',
    workloadDistribution: '',
    planAlignmentSOW: '',
    sprintPlanningSuggestions: '',
    risksClear: '',
    mitigationPractical: '',
    riskAssessmentSuggestions: '',
    overallSprintPlanningRating: '',
    overallRiskAssessmentRating: '',
    additionalComments: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  const showCustomNotification = (message) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
      
      // Check if user came from sprint results page (has sprint plan data)
      if (location.state?.sprintPlan) {
        // Navigate back to sprint results with the same state data
        navigate('/sprint-results', { 
          state: {
            sprintPlan: location.state.sprintPlan,
            originalData: location.state.originalData,
            sowData: location.state.sowData
          }
        });
      } else if (location.state?.riskAssessment) {
        // Navigate back to risk results with the same state data
        navigate('/risk-results', { 
          state: {
            riskAssessment: location.state.riskAssessment,
            originalData: location.state.originalData,
            sowData: location.state.sowData
          }
        });
      } else {
        // Navigate back to home page (user came from home page)
        navigate('/home');
      }
    }, 1500); // Auto-hide after 1.5 seconds and navigate appropriately
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      console.log('📝 [FEEDBACK] Submitting feedback:', formData);
      
      // Prepare data for API
      const feedbackData = {
        name: formData.name,
        email: formData.email,
        clarity_of_sprint_goals: formData.sprintGoalsClarity,
        workload_distribution: formData.workloadDistribution,
        plan_alignment_sow: formData.planAlignmentSOW,
        suggestions_sprint_planning: formData.sprintPlanningSuggestions,
        risks_clear: formData.risksClear,
        mitigation_practical: formData.mitigationPractical,
        suggestions_risk_assessment: formData.riskAssessmentSuggestions,
        overall_sprint_planning_rating: formData.overallSprintPlanningRating,
        overall_risk_assessment_rating: formData.overallRiskAssessmentRating,
        additional_comments: formData.additionalComments,
        user_email: user?.email || formData.email
      };
      
      console.log('📝 [FEEDBACK] Prepared data for API:', feedbackData);
      
      // Submit to API
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ [FEEDBACK] Successfully submitted:', result);
        showCustomNotification('Thank you for your valuable feedback! We appreciate your input.');
      } else {
        console.error('❌ [FEEDBACK] API Error:', result.message);
        showCustomNotification(`There was an error submitting your feedback: ${result.message}`);
      }
      
    } catch (error) {
      console.error('❌ [FEEDBACK] Network Error:', error);
      showCustomNotification('There was an error submitting your feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToHome = () => {
    navigate('/home');
  };

  return (
    <div className="feedback-page">
      {/* Custom Notification */}
      {showNotification && (
        <div className="notification">
          <div className="notification-content">
            <span className="notification-icon">✓</span>
            <span className="notification-message">{notificationMessage}</span>
          </div>
        </div>
      )}
      
      <div className="feedback-container">
        {/* Header */}
        <div className="feedback-header">
          <button className="back-btn" onClick={handleBackToHome}>
            ← Back to Home
          </button>
          <h1>Feedback Form</h1>
        </div>
        
        {/* Subtitle */}
        <div className="feedback-subtitle">
          <p>Help us improve by sharing your experience</p>
        </div>

        {/* Feedback Form */}
        <form className="feedback-form" onSubmit={handleSubmit}>
          
          {/* Name and Email Fields */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name"> Name </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter your name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="email"> Email </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
              />
            </div>
          </div>

          {/* Section Header */}
          <div className="section-header">
            <h2>🔹 Sprint Planning Feedback Section</h2>
          </div>

          {/* Sprint Planning Feedback Fields */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="sprintGoalsClarity">Clarity of Sprint Goals (Rating: 1–5)</label>
              <select
                id="sprintGoalsClarity"
                name="sprintGoalsClarity"
                value={formData.sprintGoalsClarity}
                onChange={handleInputChange}
              >
                <option value="">Select Rating</option>
                <option value="1">1 - Very Poor</option>
                <option value="2">2 - Poor</option>
                <option value="3">3 - Average</option>
                <option value="4">4 - Good</option>
                <option value="5">5 - Excellent</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="workloadDistribution">Workload Distribution (Rating: 1–5)</label>
              <select
                id="workloadDistribution"
                name="workloadDistribution"
                value={formData.workloadDistribution}
                onChange={handleInputChange}
              >
                <option value="">Select Rating</option>
                <option value="1">1 - Very Poor</option>
                <option value="2">2 - Poor</option>
                <option value="3">3 - Average</option>
                <option value="4">4 - Good</option>
                <option value="5">5 - Excellent</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="planAlignmentSOW">Plan Alignment with SOW</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="planAlignmentSOW"
                  value="Yes"
                  checked={formData.planAlignmentSOW === 'Yes'}
                  onChange={handleInputChange}
                />
                <span className="radio-text">Yes</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="planAlignmentSOW"
                  value="No"
                  checked={formData.planAlignmentSOW === 'No'}
                  onChange={handleInputChange}
                />
                <span className="radio-text">No</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="planAlignmentSOW"
                  value="Partial"
                  checked={formData.planAlignmentSOW === 'Partial'}
                  onChange={handleInputChange}
                />
                <span className="radio-text">Partial</span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="sprintPlanningSuggestions">Suggestions for Sprint Planning</label>
            <textarea
              id="sprintPlanningSuggestions"
              name="sprintPlanningSuggestions"
              value={formData.sprintPlanningSuggestions}
              onChange={handleInputChange}
              placeholder="Share your suggestions for improving sprint planning..."
              rows="4"
            />
          </div>

          {/* Risk Assessment Section Header */}
          <div className="section-header">
            <h2>🔹 Risk Assessment Feedback Section</h2>
          </div>

          {/* Risk Assessment Fields */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="risksClear">Identified Risks Were Clear?</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="risksClear"
                    value="Yes"
                    checked={formData.risksClear === 'Yes'}
                    onChange={handleInputChange}
                  />
                  <span className="radio-text">Yes</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="risksClear"
                    value="No"
                    checked={formData.risksClear === 'No'}
                    onChange={handleInputChange}
                  />
                  <span className="radio-text">No</span>
                </label>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="mitigationPractical">Risk Mitigation Steps Were Practical?</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="mitigationPractical"
                    value="Yes"
                    checked={formData.mitigationPractical === 'Yes'}
                    onChange={handleInputChange}
                  />
                  <span className="radio-text">Yes</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="mitigationPractical"
                    value="No"
                    checked={formData.mitigationPractical === 'No'}
                    onChange={handleInputChange}
                  />
                  <span className="radio-text">No</span>
                </label>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="riskAssessmentSuggestions">Suggestions for Risk Assessment</label>
            <textarea
              id="riskAssessmentSuggestions"
              name="riskAssessmentSuggestions"
              value={formData.riskAssessmentSuggestions}
              onChange={handleInputChange}
              placeholder="Share your suggestions for improving risk assessment..."
              rows="4"
            />
          </div>

          {/* Overall Feedback Section Header */}
          <div className="section-header">
            <h2>🔹 Overall Feedback Section</h2>
          </div>

          {/* Overall Feedback Fields */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="overallSprintPlanningRating">Overall Rating for Sprint Planning (Rating: 1–5)</label>
              <select
                id="overallSprintPlanningRating"
                name="overallSprintPlanningRating"
                value={formData.overallSprintPlanningRating}
                onChange={handleInputChange}
              >
                <option value="">Select Rating</option>
                <option value="1">1 - Very Poor</option>
                <option value="2">2 - Poor</option>
                <option value="3">3 - Average</option>
                <option value="4">4 - Good</option>
                <option value="5">5 - Excellent</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="overallRiskAssessmentRating">Overall Rating for Risk Assessment (Rating: 1–5)</label>
              <select
                id="overallRiskAssessmentRating"
                name="overallRiskAssessmentRating"
                value={formData.overallRiskAssessmentRating}
                onChange={handleInputChange}
              >
                <option value="">Select Rating</option>
                <option value="1">1 - Very Poor</option>
                <option value="2">2 - Poor</option>
                <option value="3">3 - Average</option>
                <option value="4">4 - Good</option>
                <option value="5">5 - Excellent</option>
              </select>
            </div>
          </div>

          {/* Additional Comments Section Header */}
          <div className="section-header">
            <h2>🔹 Additional Comments</h2>
          </div>

          {/* Additional Comments Field */}
          <div className="form-group">
            <label htmlFor="additionalComments">Additional Comments</label>
            <textarea
              id="additionalComments"
              name="additionalComments"
              value={formData.additionalComments}
              onChange={handleInputChange}
              placeholder="Share any additional comments or feedback..."
              rows="4"
            />
          </div>

          {/* Add more sections here one by one */}

          {/* Submit Button */}
          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-btn" 
              onClick={handleBackToHome}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackPage;
