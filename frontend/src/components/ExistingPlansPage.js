import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import html2pdf from 'html2pdf.js';

import './ExistingPlansPage.css';

const ExistingPlansPage = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [showWordDocument, setShowWordDocument] = useState(false);
  const [selectedWordPlan, setSelectedWordPlan] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPlans, setTotalPlans] = useState(0);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPlans, setFilteredPlans] = useState([]);
  
  // Workspace filter state
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('Created by Me');
  
  // Get user email once at component level
  const userEmail = user ? user.email : 'demo@example.com';
  
  // Fetch workspaces
  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/workspaces`);
        const data = await response.json();
        if (data.success) {
          setWorkspaces(data.workspaces || []);
        }
      } catch (err) {
        console.error('Failed to fetch workspaces:', err);
      }
    };
    fetchWorkspaces();
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      // Build query parameters
      let url = `${process.env.REACT_APP_API_URL}/api/sprint-plans`;
      const params = new URLSearchParams();
      
      if (selectedFilter === 'Created by Me') {
        params.append('filter_type', 'Created by Me');
        params.append('user_email', userEmail);
      } else {
        params.append('workspace', selectedFilter);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        const fetchedPlans = data.plans || [];
        setPlans(fetchedPlans);
        setFilteredPlans(fetchedPlans);
        setTotalPlans(fetchedPlans.length);
      } else {
        setError(data.message || 'Failed to fetch plans');
      }
    } catch (err) {
      setError('Failed to fetch plans');
    } finally {
      setLoading(false);
    }
  }, [userEmail, selectedFilter]);
  
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
    fetchPlans();
  }, [isAuthenticated, navigate, fetchPlans]);

  // Reset to first page when plans change
  useEffect(() => {
    if (plans.length > 0) {
      setCurrentPage(1);
    }
  }, [plans.length]);

  const handleCreateNewPlan = () => {
    navigate('/sprint-planning');
  };

  const handleBackToHome = () => {
    navigate('/home');
  };

  // Search and filtering logic
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPlans(plans);
    } else {
      const filtered = plans.filter(plan => {
        if (!plan.sprint_number) return false;
        
        const searchLower = searchTerm.toLowerCase().trim();
        const sprintNumber = plan.sprint_number.toString().toLowerCase();
        
        // Direct sprint number match
        if (sprintNumber.includes(searchLower)) return true;
        
        // Handle "Sprint X" format - extract number after "Sprint"
        if (searchLower.startsWith('sprint')) {
          const sprintMatch = searchLower.match(/sprint\s*(\d+)/i);
          if (sprintMatch && sprintNumber.includes(sprintMatch[1])) return true;
        }
        
        // Handle "Sprint X" format - extract number before "Sprint"
        if (searchLower.includes('sprint')) {
          const sprintMatch = searchLower.match(/(\d+)\s*sprint/i);
          if (sprintMatch && sprintNumber.includes(sprintMatch[1])) return true;
        }
        
        // Handle partial matches for complex sprint numbers (like Q1234)
        if (sprintNumber.length > 1 && searchLower.length > 1) {
          // Check if search term is a subset of sprint number
          if (sprintNumber.includes(searchLower)) return true;
          
          // Check if sprint number contains all digits from search
          const searchDigits = searchLower.replace(/\D/g, '');
          const sprintDigits = sprintNumber.replace(/\D/g, '');
          if (searchDigits && sprintDigits.includes(searchDigits)) return true;
        }
        
        return false;
      });
      setFilteredPlans(filtered);
    }
    setCurrentPage(1); // Reset to first page when searching
  }, [searchTerm, plans]);

  // Pagination helper functions
  const totalPages = Math.ceil(filteredPlans.length / pageSize);
  
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(parseInt(newSize));
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const getCurrentPagePlans = () => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredPlans.slice(startIndex, endIndex);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleViewPlan = (plan, e) => {
    e.stopPropagation();
    setSelectedPlan(plan);
    setShowDetails(true);
  };

    const handleDownloadPlan = async (plan, e) => {
    e.stopPropagation();
    
    try {
      console.log('📄 Starting PDF generation for plan:', plan);
      
      // Get the cleaned HTML content directly
      let cleanHtml = plan.generated_plan || '';
      
      // Remove starting ```html and ending ```
      cleanHtml = cleanHtml
        .replace(/^```html\s*/i, '')  // Remove starting ```html
        .replace(/```\s*$/i, '')      // Remove ending ```
        .trim();
      
      // If no generated plan, show message
      if (!cleanHtml) {
        cleanHtml = '<h1>No Generated Plan Available</h1><p>This sprint plan does not have a generated plan yet.</p>';
      }
      
      console.log('📄 Cleaned HTML length:', cleanHtml.length);
      console.log('📄 Cleaned HTML preview:', cleanHtml.substring(0, 200));
      
      // Create a complete HTML document
      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Sprint Plan - ${plan.sprint_number || 'N/A'}</title>
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
          filename: `sprint-plan-${plan.sprint_number || 'N/A'}-${new Date().toISOString().split('T')[0]}.pdf`,
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

  // generatePDFContent function removed - HTML generation now done directly in handleDownloadPlan

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedPlan(null);
  };

  const handleViewWordDocument = (plan, e) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedWordPlan(plan);
    setShowWordDocument(true);
  };

  const handleCloseWordDocument = () => {
    setShowWordDocument(false);
    setSelectedWordPlan(null);
  };

  const handleDownloadWordDocument = (plan) => {
    try {
      if (!plan.word_document) {
        alert('No Word document available for download.');
        return;
      }

      // Create a Blob with the Word document content
      const blob = new Blob([plan.word_document], { type: 'application/msword' });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sprint-plan-${plan.sprint_number || 'N/A'}-${new Date().toISOString().split('T')[0]}.doc`;
      
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

  const handleDeletePlan = (plan, e) => {
    e.stopPropagation();
    setPlanToDelete(plan);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!planToDelete) return;
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/sprint-plans/${planToDelete.id}?user_email=${encodeURIComponent(userEmail)}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Remove the deleted plan from the local state
        setPlans(prevPlans => prevPlans.filter(p => p.id !== planToDelete.id));
        setFilteredPlans(prevPlans => prevPlans.filter(p => p.id !== planToDelete.id));
        
        // Close the confirmation modal
        setShowDeleteConfirm(false);
        setPlanToDelete(null);
        
        // Success message handled silently - no popup needed
      } else {
        alert(`Failed to delete plan: ${result.message}`);
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
      alert('Error deleting plan. Please try again.');
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setPlanToDelete(null);
  };

  const cleanGeneratedPlan = (planContent) => {
    if (!planContent) return '';
    
    // Remove markdown code blocks
    let cleaned = planContent
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
      <div className="existing-plans-page">
        <div className="container">
          <div className="loading">Loading existing plans...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="existing-plans-page">
      <div className="container">
        <div className="header">
          <div className="header-left">
            <button className="btn btn-back" onClick={handleBackToHome}>
              ← Back to Home
            </button>
          </div>
          <div className="header-center">
            <h1>Existing Sprint Plans</h1>
            <p>View and manage your previously created sprint plans</p>
          </div>
          <div className="header-right">
            <button className="btn btn-primary" onClick={handleCreateNewPlan}>
              Create New Plan
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="search-container">
          <div className="filter-wrapper">
            <label htmlFor="workspaceFilter" className="filter-label">Select Filter:</label>
            <select
              id="workspaceFilter"
              value={selectedFilter}
              onChange={(e) => {
                setSelectedFilter(e.target.value);
                setCurrentPage(1); // Reset to first page when filter changes
              }}
              className="workspace-filter"
            >
              <option value="Created by Me">Created by Me</option>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.name}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="search-wrapper">
            <div className="search-input-group">
              <input
                type="text"
                placeholder="Search by Sprint Number (e.g., 1, Sprint 1, Q1234)..."
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
                  Found {filteredPlans.length} plan{filteredPlans.length !== 1 ? 's' : ''} for "{searchTerm}"
                </span>
              )}
              {!searchTerm && (
                <span className="search-tips">
                  💡 Search tips: Try "1", "Sprint 1", "Q1234", or just "1234"
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="content">
          {error && <div className="error-message">{error}</div>}
          
          {filteredPlans.length === 0 ? (
            <div className="no-plans">
              <p>No sprint plans found. Create your first plan!</p>
              <button className="btn btn-primary" onClick={handleCreateNewPlan}>
                Create New Plan
              </button>
            </div>
          ) : (
            <>
              <div className="plans-grid">
                {getCurrentPagePlans().map((plan, index) => (
                <div className="plan-card" key={plan.id}>
                  <div className="plan-header">
                    <h3>Sprint {plan.sprint_number || 'N/A'}</h3>
                    <div className="plan-meta">
                      <span className="date">{formatDate(plan.created_at)}</span>
                    </div>
                  </div>
                  
                  <div className="plan-content">
                    <p><strong>Team:</strong> {plan.team_name || 'N/A'}</p>
                    <p><strong>Duration:</strong> {plan.sprint_duration || 'N/A'}</p>
                    <p><strong>Goal:</strong> {plan.sprint_goal ? plan.sprint_goal.substring(0, 100) + '...' : 'N/A'}</p>
                  </div>
                  
                                     <div className="plan-actions">
                     <button 
                       className="btn btn-primary btn-sm" 
                       onClick={(e) => handleViewPlan(plan, e)}
                     >
                       View Plan
                     </button>
                     <button 
                       className="btn btn-success btn-sm" 
                       onClick={(e) => handleDownloadPlan(plan, e)}
                     >
                       Download PDF
                     </button>
                     <button 
                       className="btn btn-danger btn-sm" 
                       onClick={(e) => handleDeletePlan(plan, e)}
                       title="Delete this sprint plan"
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
                 <span>Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredPlans.length)} of {filteredPlans.length} plans</span>
                 {searchTerm && (
                   <span className="search-context"> (filtered from {totalPlans} total plans)</span>
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

                 {/* Detailed Plan Modal */}
         {showDetails && selectedPlan && (
           <div className="modal-overlay" onClick={handleCloseDetails}>
             <div className="modal-content" onClick={(e) => e.stopPropagation()}>
               <div className="modal-header">
                 <h2>Generated Sprint Plan - Sprint {selectedPlan.sprint_number || 'N/A'}</h2>
                 <button className="close-btn" onClick={handleCloseDetails}>×</button>
               </div>
                              <div className="modal-body">
                  {selectedPlan.generated_plan ? (
                    <div className="detail-section">
                      <div className="plan-header-section">
                        <h2 className="plan-title">Sprint Plan - Sprint {selectedPlan.sprint_number || 'N/A'}</h2>
                        <p className="plan-date">Generated on: {formatDate(selectedPlan.created_at)}</p>
                      </div>
                      
                      <div className="plan-content-wrapper">
                        <div 
                          className="generated-plan-content"
                          dangerouslySetInnerHTML={{ __html: cleanGeneratedPlan(selectedPlan.generated_plan) }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="detail-section">
                      <h3>No Generated Plan Available</h3>
                      <p>This sprint plan doesn't have a generated plan yet.</p>
                    </div>
                  )}
                </div>
               <div className="modal-footer">
                 <button className="btn btn-info" onClick={(e) => handleViewWordDocument(selectedPlan, e)}>
                   📝 View Word Doc
                 </button>
                 <button className="btn btn-success" onClick={(e) => handleDownloadPlan(selectedPlan, e)}>
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
         {showDeleteConfirm && planToDelete && (
           <div className="modal-overlay" onClick={cancelDelete}>
             <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
               <div className="modal-header">
                 <h2>🗑️ Delete Sprint Plan</h2>
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
         {showWordDocument && selectedWordPlan && (
           <div className="modal-overlay" onClick={handleCloseWordDocument}>
             <div className="modal-content word-document-modal" onClick={(e) => e.stopPropagation()}>
               <div className="modal-header">
                 <h2>📝 Word Document - Sprint {selectedWordPlan.sprint_number || 'N/A'}</h2>
                 <button className="close-btn" onClick={handleCloseWordDocument}>×</button>
               </div>
               <div className="modal-body">
                 {selectedWordPlan.word_document ? (
                   <div className="word-document-content">
                     <div 
                       dangerouslySetInnerHTML={{ __html: selectedWordPlan.word_document }}
                       className="word-document-html"
                     />
                   </div>
                 ) : (
                   <div className="no-word-document">
                     <h3>No Word Document Available</h3>
                     <p>This sprint plan doesn't have a Word document yet.</p>
                   </div>
                 )}
               </div>
               <div className="modal-footer">
                 <button className="btn btn-info" onClick={() => handleDownloadWordDocument(selectedWordPlan)}>
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

export default ExistingPlansPage;
