import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import html2pdf from 'html2pdf.js';

import './ExistingRiskAssessmentsPage.css';

const ExistingRiskAssessmentsPage = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [assessmentToDelete, setAssessmentToDelete] = useState(null);
  const [showWordDocument, setShowWordDocument] = useState(false);
  const [selectedWordAssessment, setSelectedWordAssessment] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalAssessments, setTotalAssessments] = useState(0);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredAssessments, setFilteredAssessments] = useState([]);
  
  // Get user email once at component level
  const userEmail = user ? user.email : 'demo@example.com';
  
  const fetchAssessments = useCallback(async () => {
    try {
      // Fetch risk assessments for the current user only
      const response = await fetch(`/api/risk-assessments?user_email=${encodeURIComponent(userEmail)}`);
      const data = await response.json();
      
      if (data.success) {
        const fetchedAssessments = data.assessments || [];
        setAssessments(fetchedAssessments);
        setFilteredAssessments(fetchedAssessments);
        setTotalAssessments(fetchedAssessments.length);
      } else {
        setError(data.message || 'Failed to fetch risk assessments');
      }
    } catch (err) {
      setError('Failed to fetch risk assessments');
    } finally {
      setLoading(false);
    }
  }, [userEmail]);
  
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
    fetchAssessments();
  }, [isAuthenticated, navigate, fetchAssessments]);

  // Reset to first page when assessments change
  useEffect(() => {
    if (assessments.length > 0) {
      setCurrentPage(1);
    }
  }, [assessments.length]);

  const handleCreateNewAssessment = () => {
    navigate('/risk-assessment');
  };

  const handleBackToHome = () => {
    navigate('/home');
  };

  // Search and filtering logic
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredAssessments(assessments);
    } else {
      const filtered = assessments.filter(assessment => {
        if (!assessment.project_name) return false;
        
        const searchLower = searchTerm.toLowerCase().trim();
        const projectName = assessment.project_name.toLowerCase();
        
        // Direct project name match
        if (projectName.includes(searchLower)) return true;
        
        // Handle "Risk Assessment X" format - extract number after "Risk Assessment"
        if (searchLower.startsWith('risk assessment')) {
          const riskMatch = searchLower.match(/risk assessment\s*(\d+)/i);
          if (riskMatch && projectName.includes(riskMatch[1])) return true;
        }
        
        // Handle "Risk X" format - extract number after "Risk"
        if (searchLower.startsWith('risk')) {
          const riskMatch = searchLower.match(/risk\s*(\d+)/i);
          if (riskMatch && projectName.includes(riskMatch[1])) return true;
        }
        
        // Handle partial matches for complex project names
        if (projectName.length > 1 && searchLower.length > 1) {
          // Check if search term is a subset of project name
          if (projectName.includes(searchLower)) return true;
          
          // Check if project name contains all digits from search
          const searchDigits = searchLower.replace(/\D/g, '');
          const projectDigits = projectName.replace(/\D/g, '');
          if (searchDigits && projectDigits.includes(searchDigits)) return true;
        }
        
        return false;
      });
      setFilteredAssessments(filtered);
    }
    setCurrentPage(1); // Reset to first page when searching
  }, [searchTerm, assessments]);

  // Pagination helper functions
  const totalPages = Math.ceil(filteredAssessments.length / pageSize);
  
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(parseInt(newSize));
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const getCurrentPageAssessments = () => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAssessments.slice(startIndex, endIndex);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleViewAssessment = (assessment, e) => {
    e.stopPropagation();
    setSelectedAssessment(assessment);
    setShowDetails(true);
  };

  const handleDownloadAssessment = async (assessment, e) => {
    e.stopPropagation();
    
    try {
      console.log('📄 Starting PDF generation for assessment:', assessment);
      
      // Get the cleaned HTML content directly
      let cleanHtml = assessment.generated_assessment || '';
      
      // Remove starting ```html and ending ```
      cleanHtml = cleanHtml
        .replace(/^```html\s*/i, '')  // Remove starting ```html
        .replace(/```\s*$/i, '')      // Remove ending ```
        .trim();
      
      // If no generated assessment, show message
      if (!cleanHtml) {
        cleanHtml = '<h1>No Generated Assessment Available</h1><p>This risk assessment does not have a generated assessment yet.</p>';
      }
      
      console.log('📄 Cleaned HTML length:', cleanHtml.length);
      console.log('📄 Cleaned HTML preview:', cleanHtml.substring(0, 200));
      
      // Create a complete HTML document
      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Risk Assessment - ${assessment.project_name || 'N/A'}</title>
          <style>
            body {
              font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
              margin: 20px;
              padding: 0;
              background: white;
              color: #2c3e50;
              line-height: 1.6;
            }
            h1, h2, h3 {
              color: #2d3748;
              margin: 20px 0 15px 0;
            }
            h1 { font-size: 24px; }
            h2 { font-size: 20px; }
            h3 { font-size: 18px; }
            p { margin: 10px 0; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 12px 8px;
              text-align: left;
            }
            th {
              background-color: #f8f9fa;
              font-weight: bold;
            }
            ul, ol { margin: 15px 0; padding-left: 30px; }
            li { margin: 8px 0; }
          </style>
        </head>
        <body>
          ${cleanHtml}
        </body>
        </html>
      `;
      
      console.log('📄 Full HTML document length:', fullHtml.length);
      
      // Create a temporary iframe to render the HTML properly
      const tempIframe = document.createElement('iframe');
      tempIframe.style.position = 'absolute';
      tempIframe.style.left = '-9999px';
      tempIframe.style.width = '800px';
      tempIframe.style.height = '1200px';
      tempIframe.style.border = 'none';
      tempIframe.style.backgroundColor = 'white';
      
      document.body.appendChild(tempIframe);
      
      // Write the HTML content to the iframe
      tempIframe.contentDocument.open();
      tempIframe.contentDocument.write(fullHtml);
      tempIframe.contentDocument.close();
      
      // Wait for iframe content to load
      tempIframe.onload = () => {
        console.log('📄 Iframe loaded with content');
        console.log('📄 Iframe body contains h1:', tempIframe.contentDocument.body.querySelector('h1') ? 'YES' : 'NO');
        console.log('📄 Iframe body contains h2:', tempIframe.contentDocument.body.querySelector('h2') ? 'YES' : 'NO');
        console.log('📄 Iframe body contains table:', tempIframe.contentDocument.body.querySelector('table') ? 'YES' : 'NO');
        
        // Generate PDF from iframe body
        const opt = {
          margin: [15, 15, 15, 15],
          filename: `risk-assessment-${assessment.project_name || 'N/A'}-${new Date().toISOString().split('T')[0]}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
            scale: 1,
            useCORS: true,
            letterRendering: true
          },
          jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait'
          }
        };
        
        console.log('📄 html2pdf options:', opt);
        
        // Generate PDF from iframe body
        html2pdf().set(opt).from(tempIframe.contentDocument.body).save().then(() => {
          console.log('📄 PDF generated successfully!');
          document.body.removeChild(tempIframe);
        }).catch(error => {
          console.error('📄 Error in html2pdf:', error);
          document.body.removeChild(tempIframe);
          alert('Error generating PDF. Please try again.');
        });
      };
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedAssessment(null);
  };

  const handleViewWordDocument = (assessment, e) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedWordAssessment(assessment);
    setShowWordDocument(true);
  };

  const handleCloseWordDocument = () => {
    setShowWordDocument(false);
    setSelectedWordAssessment(null);
  };

  const handleDownloadWordDocument = (assessment) => {
    try {
      if (!assessment.word_document) {
        alert('No Word document available for download.');
        return;
      }

      // Create a Blob with the Word document content
      const blob = new Blob([assessment.word_document], { type: 'application/msword' });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `risk-assessment-${assessment.project_name || 'N/A'}-${new Date().toISOString().split('T')[0]}.doc`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(url);
      
      console.log('📝 Word document downloaded successfully!');
      alert('Word document downloaded successfully!');
      
    } catch (error) {
      console.error('❌ Error downloading Word document:', error);
      alert('Error downloading Word document. Please try again.');
    }
  };

  const handleDeleteAssessment = (assessment, e) => {
    e.stopPropagation();
    setAssessmentToDelete(assessment);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!assessmentToDelete) return;
    
    try {
      const response = await fetch(`/api/risk-assessments/${assessmentToDelete.id}?user_email=${encodeURIComponent(userEmail)}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Remove the deleted assessment from the local state
        setAssessments(prevAssessments => prevAssessments.filter(a => a.id !== assessmentToDelete.id));
        setFilteredAssessments(prevAssessments => prevAssessments.filter(a => a.id !== assessmentToDelete.id));
        
        // Close the confirmation modal
        setShowDeleteConfirm(false);
        setAssessmentToDelete(null);
        
        // Success message handled silently - no popup needed
      } else {
        alert(`Failed to delete assessment: ${result.message}`);
      }
    } catch (error) {
      console.error('Error deleting assessment:', error);
      alert('Error deleting assessment. Please try again.');
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setAssessmentToDelete(null);
  };

  const cleanGeneratedAssessment = (assessmentContent) => {
    if (!assessmentContent) return '';
    
    // Remove markdown code blocks
    let cleaned = assessmentContent
      .replace(/```html\s*/gi, '')  // Remove ```html
      .replace(/```\s*/gi, '')      // Remove ``` at end
      .replace(/^```.*$/gm, '')     // Remove any ``` lines
      .replace(/^\s*```\s*$/gm, '') // Remove standalone ```
      .trim();
    
    // Remove any remaining markdown artifacts
    cleaned = cleaned
      .replace(/^\s*#+\s*/gm, '')   // Remove markdown headers
      .replace(/^\s*-\s*/gm, '')    // Remove markdown list markers
      .replace(/^\s*\*\s*/gm, '')   // Remove markdown list markers
      .replace(/^\s*`\s*/gm, '')    // Remove inline code markers
      .replace(/\s*`\s*$/gm, '')    // Remove inline code markers
      .trim();
    
    // Clean up excessive spacing and improve structure
    cleaned = cleaned
      .replace(/\n\s*\n\s*\n/g, '\n\n')  // Remove multiple consecutive empty lines
      .replace(/\s+$/gm, '')              // Remove trailing whitespace from lines
      .replace(/^\s+/gm, '')              // Remove leading whitespace from lines
      .replace(/>\s+</g, '><')            // Remove whitespace between HTML tags
      .replace(/\s{2,}/g, ' ')            // Replace multiple spaces with single space
      .trim();
    
    return cleaned;
  };

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div className="existing-risk-assessments-page">
        <div className="container">
          <div className="loading">Loading existing risk assessments...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="existing-risk-assessments-page">
      <div className="container">
        <div className="header">
          <div className="header-left">
            <button className="btn btn-back" onClick={handleBackToHome}>
              ← Back to Home
            </button>
          </div>
          <div className="header-center">
            <h1>Existing Risk Assessments</h1>
            <p>View and manage your previously created risk assessments</p>
          </div>
          <div className="header-right">
            <button className="btn btn-primary" onClick={handleCreateNewAssessment}>
              Create New Assessment
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-container">
          <div className="search-wrapper">
            <div className="search-input-group">
              <input
                type="text"
                placeholder="Search by Project Name (e.g., Project Alpha, Risk Assessment 1)..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="search-input"
              />
              {searchTerm && (
                <button 
                  className="clear-search-btn" 
                  onClick={clearSearch}
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </div>
            <div className="search-info">
              {searchTerm && (
                <span className="search-results">
                  Found {filteredAssessments.length} assessment{filteredAssessments.length !== 1 ? 's' : ''} for "{searchTerm}"
                </span>
              )}
              {!searchTerm && (
                <span className="search-tips">
                  💡 Search tips: Try "Project Alpha", "Risk Assessment 1", or just "Alpha"
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="content">
          {error && <div className="error-message">{error}</div>}
          
          {filteredAssessments.length === 0 ? (
            <div className="no-assessments">
              <p>No risk assessments found. Create your first assessment!</p>
              <button className="btn btn-primary" onClick={handleCreateNewAssessment}>
                Create New Assessment
              </button>
            </div>
          ) : (
            <>
              <div className="assessments-grid">
                {getCurrentPageAssessments().map((assessment, index) => (
                  <div className="assessment-card" key={assessment.id}>
                    <div className="assessment-header">
                      <h3>{assessment.project_name || 'N/A'}</h3>
                      <div className="assessment-meta">
                        <span className="date">{formatDate(assessment.created_at)}</span>
                      </div>
                    </div>
                    
                    <div className="assessment-content">
                      <p><strong>Team:</strong> {assessment.team_name || 'N/A'}</p>
                      <p><strong>Duration:</strong> {assessment.project_duration || 'N/A'}</p>
                      <p><strong>Scope:</strong> {assessment.project_scope ? assessment.project_scope.substring(0, 100) + '...' : 'N/A'}</p>
                    </div>
                    
                    <div className="assessment-actions">
                      <button 
                        className="btn btn-primary btn-sm" 
                        onClick={(e) => handleViewAssessment(assessment, e)}
                      >
                        View Assessment
                      </button>
                      <button 
                        className="btn btn-success btn-sm" 
                        onClick={(e) => handleDownloadAssessment(assessment, e)}
                      >
                        Download PDF
                      </button>
                      <button 
                        className="btn btn-danger btn-sm" 
                        onClick={(e) => handleDeleteAssessment(assessment, e)}
                        title="Delete this risk assessment"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination Controls */}
              <div className="pagination-container">
                <div className="pagination-info">
                  <span>Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredAssessments.length)} of {filteredAssessments.length} assessments</span>
                  {searchTerm && (
                    <span className="search-context"> (filtered from {totalAssessments} total assessments)</span>
                  )}
                </div>
                
                <div className="pagination-controls">
                  <div className="page-size-selector">
                    <label htmlFor="pageSize">Show:</label>
                    <select 
                      id="pageSize" 
                      value={pageSize} 
                      onChange={(e) => handlePageSizeChange(e.target.value)}
                      className="page-size-select"
                    >
                      <option value={5}>5</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                  
                  <div className="page-navigation">
                    <button 
                      className="btn btn-secondary pagination-btn"
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                    >
                      « First
                    </button>
                    <button 
                      className="btn btn-secondary pagination-btn"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      ‹ Previous
                    </button>
                    
                    <span className="page-numbers">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            className={`btn pagination-btn ${currentPage === pageNum ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => handlePageChange(pageNum)}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </span>
                    
                    <button 
                      className="btn btn-secondary pagination-btn"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next ›
                    </button>
                    <button 
                      className="btn btn-secondary pagination-btn"
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      Last »
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Detailed Assessment Modal */}
        {showDetails && selectedAssessment && (
          <div className="modal-overlay" onClick={handleCloseDetails}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Generated Risk Assessment - {selectedAssessment.project_name || 'N/A'}</h2>
                <button className="close-btn" onClick={handleCloseDetails}>×</button>
              </div>
              <div className="modal-body">
                {selectedAssessment.generated_assessment ? (
                  <div className="detail-section">
                    <div className="assessment-header-section">
                      <h2 className="assessment-title">Risk Assessment - {selectedAssessment.project_name || 'N/A'}</h2>
                      <p className="assessment-date">Generated on: {formatDate(selectedAssessment.created_at)}</p>
                    </div>
                    
                    <div className="assessment-content-wrapper">
                      <div 
                        className="generated-assessment-content"
                        dangerouslySetInnerHTML={{ __html: cleanGeneratedAssessment(selectedAssessment.generated_assessment) }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="detail-section">
                    <h3>No Generated Assessment Available</h3>
                    <p>This risk assessment doesn't have a generated assessment yet.</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-info" onClick={(e) => handleViewWordDocument(selectedAssessment, e)}>
                  📝 View Word Doc
                </button>
                <button className="btn btn-success" onClick={(e) => handleDownloadAssessment(selectedAssessment, e)}>
                  Download PDF
                </button>
                <button className="btn btn-secondary" onClick={handleCloseDetails}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && assessmentToDelete && (
          <div className="modal-overlay" onClick={cancelDelete}>
            <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>🗑️ Delete Risk Assessment</h2>
                <button className="close-btn" onClick={cancelDelete}>×</button>
              </div>
              <div className="modal-body">
                <div className="delete-warning">
                  <div className="warning-icon">⚠️</div>
                  <h3>Please confirm to delete</h3>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-danger" onClick={confirmDelete}>
                  🗑️ Delete
                </button>
                <button className="btn btn-secondary" onClick={cancelDelete}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Word Document Modal */}
        {showWordDocument && selectedWordAssessment && (
          <div className="modal-overlay" onClick={handleCloseWordDocument}>
            <div className="modal-content word-document-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>📝 Word Document - {selectedWordAssessment.project_name || 'N/A'}</h2>
                <button className="close-btn" onClick={handleCloseWordDocument}>×</button>
              </div>
              <div className="modal-body">
                {selectedWordAssessment.word_document ? (
                  <div className="word-document-content">
                    <div 
                      dangerouslySetInnerHTML={{ __html: selectedWordAssessment.word_document }}
                      className="word-document-html"
                    />
                  </div>
                ) : (
                  <div className="no-word-document">
                    <h3>No Word Document Available</h3>
                    <p>This risk assessment doesn't have a Word document yet.</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-info" onClick={() => handleDownloadWordDocument(selectedWordAssessment)}>
                  📥 Download Word Doc
                </button>
                <button className="btn btn-secondary" onClick={handleCloseWordDocument}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExistingRiskAssessmentsPage;
