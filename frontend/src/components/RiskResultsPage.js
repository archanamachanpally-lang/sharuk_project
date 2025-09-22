import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import html2pdf from 'html2pdf.js';
import './RiskResultsPage.css';

const RiskResultsPage = () => {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // State for the generated assessment and user inputs
  const [currentGeneratedAssessment, setCurrentGeneratedAssessment] = useState('');
  
  // State for editing functionality
  const [isEditing, setIsEditing] = useState(false);
  const [editedAssessment, setEditedAssessment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSowModal, setShowSowModal] = useState(false);
  const [existingSowName, setExistingSowName] = useState('');
  const [existingSowText, setExistingSowText] = useState('');
  const [showSowExisting, setShowSowExisting] = useState(false);
  
  // State for comments functionality
  const [isCommentsMode, setIsCommentsMode] = useState(false);
  const [commentDialogues, setCommentDialogues] = useState({});
  const [isProcessingComment, setIsProcessingComment] = useState(false);
  const [updatedAssessmentWithComments, setUpdatedAssessmentWithComments] = useState('');
  
  // State for tracking saved comments
  const [savedComments, setSavedComments] = useState({});
  const [headerMappings, setHeaderMappings] = useState({});

  // State for SOW functionality
  const [hasUploadedNewSow, setHasUploadedNewSow] = useState(false);
  const [selectedSowFile, setSelectedSowFile] = useState(null);
  const [sowFileName, setSowFileName] = useState('');
  const [sowFileContent, setSowFileContent] = useState('');

  // State for validate plan modal
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [showValidationResult, setShowValidationResult] = useState(false);
  const [validationResult, setValidationResult] = useState('');
  
  // Ref for the contenteditable div
  const contentEditableRef = useRef(null);
  
  // Ref for the file input
  const fileInputRef = useRef(null);
  
  // State for comment processing loading
  const [isCommentProcessing, setIsCommentProcessing] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  // Get data from navigation state
  const { riskAssessment, originalData, sowData } = location.state || {};
  
  // Extract the generated assessment and user inputs from the risk assessment response
  const generatedAssessment = riskAssessment?.response || riskAssessment?.summary || riskAssessment?.word_document;
  const userInputs = originalData;
  
  // Load the generated assessment when component mounts
  React.useEffect(() => {
    if (generatedAssessment) {
      setCurrentGeneratedAssessment(generatedAssessment);
    }
  }, [generatedAssessment]);

  useEffect(() => {
    try {
      
      // Only set initial SOW content if we haven't uploaded new content AND we have SOW data from navigation
      if (!hasUploadedNewSow && sowData?.content) {
        // Only load SOW content if it was provided through navigation state (meaning it was uploaded for this risk assessment)
        const sowText = sowData.content;
        const sowName = sowData.fileName || 'Uploaded SOW';
        console.log('📄 Loading initial SOW content from navigation state:', sowText.substring(0, 100) + '...');
        setExistingSowText(sowText);
        setExistingSowName(sowName);
      } else if (!hasUploadedNewSow && !sowData?.content) {
        // Clear any existing SOW content if no SOW was provided for this risk assessment
        console.log('📄 No SOW content provided for this risk assessment, clearing existing content');
        setExistingSowText('');
        setExistingSowName('');
        // Also clear sessionStorage to prevent persistence across different risk assessments
        sessionStorage.removeItem('sowContentRaw');
        sessionStorage.removeItem('sowContentHtml');
        sessionStorage.removeItem('sowFileName');
        console.log('📄 Cleared all SOW-related sessionStorage');
      }
    } catch (error) {
      console.error('📄 Error in SOW useEffect:', error);
    }
  }, [sowData, hasUploadedNewSow]);
  
  // Create header mappings when entering comments mode
  React.useEffect(() => {
    if (isCommentsMode && currentGeneratedAssessment) {
      createHeaderMappings(currentGeneratedAssessment);
    }
  }, [isCommentsMode, currentGeneratedAssessment]);
  
  // Make comment functions available globally for inline onclick handlers
  React.useEffect(() => {
    window.handleAddComment = handleAddComment;
    window.handleSaveComment = handleSaveComment;
    
    return () => {
      delete window.handleAddComment;
      delete window.handleSaveComment;
    };
  }, []);
  
  // Authentication check
  React.useEffect(() => {
    // Only redirect if not loading and not authenticated
    if (!authLoading && !isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Debug logging
  console.log('RiskResultsPage - Location State:', location.state);
  console.log('RiskResultsPage - RiskAssessment:', riskAssessment);
  console.log('RiskResultsPage - OriginalData:', originalData);
  console.log('RiskResultsPage - GeneratedAssessment:', generatedAssessment);
  console.log('RiskResultsPage - CurrentGeneratedAssessment:', currentGeneratedAssessment);
  console.log('RiskResultsPage - UserInputs:', userInputs);
  console.log('RiskResultsPage - RiskAssessment fields:', {
    id: riskAssessment?.id,
    response: riskAssessment?.response,
    summary: riskAssessment?.summary,
    word_document: riskAssessment?.word_document
  });

  const handleBackToAssessment = () => {
    navigate('/risk-assessment');
  };

  const handleViewExistingAssessments = () => {
    navigate('/existing-assessments');
  };

  // Handle regenerating the risk assessment
  const handleRegenerateAssessment = async () => {
    try {
      console.log('🔄 Starting risk assessment regeneration...');
      
      // Get the current risk assessment ID
      const assessmentId = riskAssessment?.assessment_id || riskAssessment?.id;
      
      if (!assessmentId) {
        alert('Error: No risk assessment ID found. Cannot regenerate assessment.');
        return;
      }

      // Get the updated SOW content (if any new SOW was uploaded)
      const updatedSowContent = sessionStorage.getItem('sowContentHtml') || sessionStorage.getItem('sowContentRaw') || originalData?.sow_content;
      
      // Get the current generated assessment content
      const currentAssessmentContent = currentGeneratedAssessment || riskAssessment?.response || riskAssessment?.summary || riskAssessment?.word_document || '';

      if (!currentAssessmentContent) {
        alert('Error: No current assessment content found. Cannot regenerate assessment.');
        return;
      }

      // Show loading state
      console.log('🔄 Setting loading state for regeneration...');
      setIsCommentProcessing(true);
      setLoadingMessage('Regenerating risk assessment...');
      setLoadingProgress(0);
      console.log('✅ Loading state set for regeneration');
      
      // Force a small delay to ensure state update is visible
      await new Promise(resolve => setTimeout(resolve, 100));

      // Simulate progress
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Prepare the regeneration request with original data and updated SOW content
      const regenerateRequest = {
        ...originalData,
        sow_content: updatedSowContent,
        user_email: user?.email || 'unknown@example.com'
      };

      console.log('🔄 Sending regeneration request:', regenerateRequest);

      const response = await fetch('/api/risk-assessment/generate-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(regenerateRequest),
      });

      const result = await response.json();
      
      clearInterval(progressInterval);
      setLoadingProgress(100);

      if (result.success) {
        console.log('✅ Risk assessment regenerated successfully');
        
        // Update the current assessment with the new content
        setCurrentGeneratedAssessment(result.response);
        
        // Update the risk assessment in state
        const updatedRiskAssessment = {
          ...riskAssessment,
          response: result.response,
          assessment_id: result.assessment_id || assessmentId
        };
        
        // Navigate back to results with updated data
        navigate('/risk-results', { 
          state: { 
            riskAssessment: updatedRiskAssessment,
            originalData: regenerateRequest,
            sowData: (() => {
              const sowContent = sessionStorage.getItem('sowContentHtml') || sessionStorage.getItem('sowContentRaw');
              return sowContent ? {
                content: sowContent,
                fileName: sessionStorage.getItem('sowFileName') || 'Uploaded SOW',
                isHtml: !!sessionStorage.getItem('sowContentHtml')
              } : null;
            })()
          } 
        });
        
        setLoadingMessage('Risk assessment regenerated successfully!');
        setTimeout(() => {
          setIsCommentProcessing(false);
          setLoadingProgress(0);
          setLoadingMessage('');
        }, 1000);
        
      } else {
        console.error('❌ Error regenerating risk assessment:', result.message);
        alert(`Error regenerating risk assessment: ${result.message}`);
        setIsCommentProcessing(false);
        setLoadingProgress(0);
        setLoadingMessage('');
      }
      
    } catch (error) {
      console.error('❌ Error regenerating risk assessment:', error);
      alert(`Error regenerating risk assessment: ${error.message}`);
      setIsCommentProcessing(false);
      setLoadingProgress(0);
      setLoadingMessage('');
    }
  };

  // SOW Upload functionality
  const handleSowUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    setSelectedSowFile(file);
    setSowFileName(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/sow', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.success) {
        const textContent = result.data.rawText || '';
        const htmlContent = result.data.htmlContent || '';
        
        if (htmlContent) {
          console.log('📄 Setting existing SOW HTML:', htmlContent.substring(0, 100) + '...');
          setExistingSowText(htmlContent);
          setExistingSowName(file.name);
          setHasUploadedNewSow(true); // Mark that we've uploaded new content
          // Store in sessionStorage for persistence
          sessionStorage.setItem('sowContentHtml', htmlContent);
          sessionStorage.setItem('sowContentRaw', textContent);
          sessionStorage.setItem('sowFileName', file.name);
        } else {
          console.log('📄 Setting existing SOW text:', textContent.substring(0, 100) + '...');
          setExistingSowText(textContent);
          setExistingSowName(file.name);
          setHasUploadedNewSow(true); // Mark that we've uploaded new content
          sessionStorage.setItem('sowContentRaw', textContent);
          sessionStorage.setItem('sowFileName', file.name);
        }
        console.log('📄 Updated existingSowText and existingSowName');
        console.log('📄 hasUploadedNewSow set to:', true);
      } else {
        console.error('❌ Error uploading SOW:', result.error);
        alert(`Error uploading SOW: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error uploading SOW:', error);
      alert(`Error uploading SOW: ${error.message}`);
    }
  };

  const readPDFContent = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target.result;
          const pdf = await import('pdfjs-dist');
          const loadingTask = pdf.getDocument({ data: arrayBuffer });
          const pdfDoc = await loadingTask.promise;
          
          let fullText = '';
          for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
          }
          
          resolve(fullText);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const readDOCXContent = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target.result;
          const mammoth = await import('mammoth');
          const result = await mammoth.extractRawText({ arrayBuffer });
          resolve(result.value);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // Format SOW content for display
  const formatSowContentForDisplay = (content) => {
    if (!content) return '';
    
    // Convert plain text to HTML with basic formatting
    return content
      .split('\n')
      .map(line => {
        line = line.trim();
        if (!line) return '';
        
        // Headers
        if (line.match(/^[A-Z][A-Z\s]+:$/)) {
          return `<h3 style="color: #2d3748; margin: 15px 0 10px 0; font-weight: 600;">${line}</h3>`;
        }
        // Sub-headers
        else if (line.match(/^[A-Z][a-z\s]+:$/)) {
          return `<h4 style="color: #4a5568; margin: 12px 0 8px 0; font-weight: 600;">${line}</h4>`;
        }
        // Bullet points
        else if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
          return `<li style="margin: 5px 0; color: #4a5568;">${line.substring(1).trim()}</li>`;
        }
        // Regular paragraphs
        else if (line.trim()) {
          return `<p style="margin: 8px 0; color: #4a5568; line-height: 1.5;">${line}</p>`;
        }
        return '';
      })
      .filter(line => line.trim())
      .join('\n');
  };

  // Validate Plan functionality
  const handleValidatePlan = async () => {
    try {
      const currentAssessmentContent = currentGeneratedAssessment || riskAssessment?.response || riskAssessment?.summary || riskAssessment?.word_document || '';
      
      // Get the SOW content for validation
      const sowContent = existingSowText || sessionStorage.getItem('sowContentHtml') || sessionStorage.getItem('sowContentRaw') || '';

      if (!currentAssessmentContent) {
        alert('Error: No risk assessment content found for validation.');
        return;
      }

      if (!sowContent) {
        alert('Error: No SOW content found for validation. Please upload a SOW document first.');
        return;
      }

      // Show loading state
      console.log('🔄 Setting loading state for validation...');
      setIsCommentProcessing(true);
      setLoadingMessage('Validating risk assessment against SOW...');
      setLoadingProgress(0);
      console.log('✅ Loading state set for validation');
      
      // Force a small delay to ensure state update is visible
      await new Promise(resolve => setTimeout(resolve, 100));

      // Simulate progress
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Call validation endpoint
      const response = await fetch('/api/risk/validate-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          risk_assessment_content: currentAssessmentContent,
          sow_content: sowContent
        }),
      });

      const result = await response.json();
      
      // Clear progress interval
      clearInterval(progressInterval);
      
      // Complete progress
      setLoadingProgress(100);
      setTimeout(() => {
        setIsCommentProcessing(false);
        setLoadingProgress(0);
        setLoadingMessage('');
      }, 500);

      if (result.success) {
        console.log('✅ Validation successful:', result.response);
        
        // Extract percentage from response
        const responseText = result.response || '';
        const percentageMatch = responseText.match(/(\d+)%/);
        const percentage = percentageMatch ? percentageMatch[1] : 'Unknown';
        
        setValidationResult(`Generated risk assessment ${percentage}% aligned with the SOW.`);
        setShowValidationResult(true);
        setShowValidateModal(false);
      } else {
        console.error('❌ Error validating assessment:', result.error);
        alert(`Error validating assessment: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error validating assessment:', error);
      setIsCommentProcessing(false);
      setLoadingProgress(0);
      setLoadingMessage('');
      alert(`Error validating assessment: ${error.message}`);
    }
  };

  // Edit Assessment functionality
  const handleEditAssessment = () => {
    setIsEditing(true);
    setIsCommentsMode(false);
    
    console.log('✏️ [EDIT ASSESSMENT] Starting edit process...');
    console.log('✏️ [EDIT ASSESSMENT] CurrentGeneratedAssessment type:', typeof currentGeneratedAssessment);
    console.log('✏️ [EDIT ASSESSMENT] CurrentGeneratedAssessment length:', currentGeneratedAssessment?.length || 0);
    console.log('✏️ [EDIT ASSESSMENT] CurrentGeneratedAssessment preview:', currentGeneratedAssessment?.substring(0, 200));
    
    // Get the content exactly as it appears in the current generated assessment
    let editContent = '';
    
    if (currentGeneratedAssessment) {
      console.log('✏️ [EDIT ASSESSMENT] Processing currentGeneratedAssessment content...');
      
      // Remove only markdown code blocks, keep HTML formatting
      editContent = currentGeneratedAssessment
        .replace(/```html\s*/gi, '')
        .replace(/```\s*$/gi, '')
        .replace(/^```.*$/gm, '')
        .trim();
      
      console.log('✏️ [EDIT ASSESSMENT] After markdown removal:', editContent.substring(0, 200));
      
      // If no content after markdown removal, use the original
      if (!editContent.trim()) {
        editContent = currentGeneratedAssessment;
      }
    } else {
      console.log('❌ [EDIT ASSESSMENT] No currentGeneratedAssessment available!');
      
      // Try to get content from the currently displayed assessment as fallback
      const displayedContent = document.querySelector('.gemini-html-response');
      if (displayedContent) {
        editContent = displayedContent.innerHTML || displayedContent.outerHTML || '';
        console.log('✏️ [EDIT ASSESSMENT] Fallback: Got content from displayed assessment:', editContent.substring(0, 200));
      }
    }
    
    console.log('✏️ [EDIT ASSESSMENT] Final content for editing (with HTML):', editContent);
    setEditedAssessment(editContent);
    
    // Set the content directly in the DOM to prevent re-renders
    setTimeout(() => {
      if (contentEditableRef.current) {
        contentEditableRef.current.innerHTML = editContent;
        // Focus and place cursor at the end
        contentEditableRef.current.focus();
        placeCursorAtEnd();
      }
    }, 50);
  };

  const handleCommentsMode = () => {
    setIsCommentsMode(true);
    setIsEditing(false);
    setUpdatedAssessmentWithComments(currentGeneratedAssessment);
  };

  const handleAddComment = (headerId) => {
    setCommentDialogues(prev => ({
      ...prev,
      [headerId]: true
    }));
  };

  const handleSaveComment = async (headerId, comment) => {
    if (!comment.trim()) return;
    
    try {
      setIsProcessingComment(true);
      setIsCommentProcessing(true); // Start comment processing loading
      setLoadingProgress(0);
      setLoadingMessage('');
      
      // Define progress stages for comment processing
      const progressStages = [
        { progress: 15, message: "Analyzing your comment..." },
        { progress: 35, message: "Processing risk assessment..." },
        { progress: 55, message: "Evaluating risk data..." },
        { progress: 75, message: "Generating AI response..." },
        { progress: 90, message: "Finalizing updates..." }
      ];
      
      let currentStage = 0;
      const progressInterval = setInterval(() => {
        if (currentStage < progressStages.length) {
          setLoadingProgress(progressStages[currentStage].progress);
          setLoadingMessage(progressStages[currentStage].message);
          currentStage++;
        }
      }, 600); // Move to next stage every 600ms
      
      // Get the header text from the assessment
      const headerText = getHeaderTextFromId(headerId);
      
      // Save the comment with header information
      const newComment = {
        headerId,
        headerText,
        comment: comment.trim(),
        timestamp: new Date().toLocaleString()
      };
      
      // Create the formatted string and store it
      const formattedInstruction = `do changes in ${headerText} section only, These are my instructions :  ${comment.trim()}, give me updated response after doing the changes`;
      
      // Print the variable value in program log
      console.log('📋 [PROGRAM LOG] Formatted Instruction Variable Value:', formattedInstruction);
      
      setSavedComments(prev => ({
        ...prev,
        [headerId]: newComment
      }));
      
      // Log detailed tracking information to console
      console.log('='.repeat(60));
      console.log('💬 COMMENT SAVED SUCCESSFULLY!');
      console.log('='.repeat(60));
      console.log(`📋 Header: "${headerText}"`);
      console.log(`🆔 Header ID: ${headerId}`);
      console.log(`💭 Comment: "${comment.trim()}"`);
      console.log(`⏰ Timestamp: ${newComment.timestamp}`);
      console.log('='.repeat(60));
      
      // Show the formatted output as requested
      console.log('📝 FORMATTED OUTPUT:');
      console.log(formattedInstruction);
      console.log('='.repeat(60));
      
      // Also log the stored variable for verification
      
      // Log all saved comments for this session
      console.log('📚 ALL SAVED COMMENTS IN THIS SESSION:');
      const allComments = { ...savedComments, [headerId]: newComment };
      Object.values(allComments).forEach((commentData, index) => {
        console.log(`${index + 1}. Header: "${commentData.headerText}" | Comment: "${commentData.comment}" | Time: ${commentData.timestamp}`);
      });
      console.log('='.repeat(60));
      
      console.log(`💬 [COMMENTS] Comment saved for header "${headerText}":`, comment);
      
      // Get the current HTML content from generated_assessment
      const currentHtmlContent = currentGeneratedAssessment;
      console.log('🔍 [LLM] Current HTML content length:', currentHtmlContent?.length || 0);
      
      // Prepare the prompt for LLM with HTML content and instructions
      const llmPrompt = `${formattedInstruction}

Current HTML Content:
${currentHtmlContent}

Please update the HTML content according to the instructions above. Return only the updated HTML content with the changes applied.`;

      console.log('🤖 [LLM] Calling LLM service with prompt length:', llmPrompt.length);
      
      // Call LLM service to get updated HTML
      const response = await callLLMService(llmPrompt);
      
      // Clear the progress interval
      clearInterval(progressInterval);
      
      if (response.success) {
        // Set progress to 100% when complete
        setLoadingProgress(100);
        setLoadingMessage('Comment processed successfully!');
        
        // Wait a moment to show completion
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('✅ [LLM] LLM service response received successfully');
        console.log('📝 [LLM] Updated HTML length:', response.response?.length || 0);
        
        // Overwrite the existing generated_assessment with new HTML
        const updatedHtml = response.response;
        setCurrentGeneratedAssessment(updatedHtml);
        
        // Also update the updatedAssessmentWithComments for consistency
        setUpdatedAssessmentWithComments(updatedHtml);
        
        console.log('💾 [LLM] Generated assessment updated with new HTML content');
        
        // Success message removed - no more popup
        
      } else {
        console.error('❌ [LLM] LLM service error:', response.error);
        console.error('❌ [LLM] Full error details:', response);
        
        // Show more detailed error message
        const errorMsg = `Error processing comment with LLM: ${response.error}\n\nThis might be a backend service issue. Please check the console for more details.`;
        alert(errorMsg);
      }
      
      // Close the comment dialogue
      setCommentDialogues(prev => ({
        ...prev,
        [headerId]: false
      }));
      
    } catch (error) {
      console.error('❌ [COMMENTS] Error processing comment:', error);
      alert('Error processing comment. Please try again.');
    } finally {
      // Clear any remaining progress interval
      if (window.progressInterval) {
        clearInterval(window.progressInterval);
      }
      
      setIsProcessingComment(false);
      setIsCommentProcessing(false); // Stop comment processing loading
      setLoadingProgress(0);
      setLoadingMessage('');
      // Close the dialogue
      setCommentDialogues(prev => ({
        ...prev,
        [headerId]: false
      }));
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setIsCommentsMode(false);
    setEditedAssessment('');
    
    // Reset the contenteditable div to the original content
    if (contentEditableRef.current) {
      contentEditableRef.current.innerHTML = formatContentForDisplay(cleanGeneratedAssessment(currentGeneratedAssessment));
    }
  };

  const handleSaveAssessment = async () => {
    if (!editedAssessment.trim()) {
      alert('Please enter assessment content before saving.');
      return;
    }

    setIsSaving(true);
    try {
      // Update the local state immediately for better UX
      const updatedAssessment = editedAssessment.trim();
      
      console.log('💾 [SAVE ASSESSMENT] Saving edited assessment:', updatedAssessment);
      
      // Clean the assessment content to remove any unwanted HTML artifacts
      const cleanedAssessment = cleanGeneratedAssessment(updatedAssessment);
      
      console.log('💾 [SAVE ASSESSMENT] Original edited assessment:', updatedAssessment.substring(0, 200));
      console.log('💾 [SAVE ASSESSMENT] Final cleaned assessment:', cleanedAssessment.substring(0, 200));
      
      // Update the current generated assessment with the cleaned content
      setCurrentGeneratedAssessment(cleanedAssessment);
      
      // Here you would typically save to backend
      // For now, we'll just update the local state
      console.log('💾 [SAVE ASSESSMENT] Assessment updated successfully in local state');
      
      // Success message removed - no more popup
      
      // Exit edit mode
      setIsEditing(false);
      setEditedAssessment('');
      
    } catch (error) {
      console.error('❌ [SAVE ASSESSMENT] Error saving assessment:', error);
      alert(`Error saving assessment: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle content changes in the contenteditable div
  const handleContentChange = (e) => {
    try {
      // Get current cursor position before content changes
      const cursorPos = getCurrentCursorPosition();
      
      // Get the HTML content to preserve formatting
      const htmlContent = e.target.innerHTML || e.target.outerHTML || '';
      
      // Store the content in state but don't re-render the contenteditable div
      setEditedAssessment(htmlContent);
      
      // Restore cursor position immediately if we have it
      if (cursorPos) {
        setCursorPosition(cursorPos.offset, cursorPos.container);
      }
      
      // Log only occasionally to avoid console spam
      if (Math.random() < 0.1) { // Log only 10% of the time
        console.log('✏️ [CONTENT CHANGE] HTML content length:', htmlContent.length);
      }
    } catch (error) {
      console.warn('⚠️ [CONTENT CHANGE] Error handling content change:', error);
      // Fallback: update with current content
      setEditedAssessment(e.target.innerHTML || '');
    }
  };

  const handleDownloadAssessment = () => {
    try {
      console.log('📄 Starting PDF generation for Risk Assessment Results');
      console.log('📄 User inputs:', userInputs);
      console.log('📄 Current generated assessment:', currentGeneratedAssessment);
      
      // Get the cleaned HTML content directly
      let cleanHtml = currentGeneratedAssessment || '';
      
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
          <title>Risk Assessment - ${userInputs?.project_overview?.ProjectName || 'N/A'}</title>
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
          filename: `risk-assessment-${userInputs?.project_overview?.ProjectName || 'N/A'}-${new Date().toISOString().split('T')[0]}.pdf`,
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

  const cleanGeneratedAssessment = (assessmentContent) => {
    if (!assessmentContent) return '';
    
    console.log('🔍 [CLEAN ASSESSMENT] Input content preview:', assessmentContent.substring(0, 200));
    console.log('🔍 [CLEAN ASSESSMENT] Contains HTML tags:', assessmentContent.includes('<') && assessmentContent.includes('>'));
    
    // Remove markdown code blocks but preserve HTML formatting
    let cleaned = assessmentContent
      .replace(/```html\s*/gi, '')  // Remove ```html
      .replace(/```\s*$/gi, '')      // Remove ending ```
      .replace(/^```.*$/gm, '')      // Remove any ``` lines
      .replace(/^\s*```\s*$/gm, '') // Remove standalone ```
      .trim();
    
    // Keep HTML tags for proper rendering
    // Only remove markdown artifacts
    cleaned = cleaned
      .replace(/^\s*#+\s*/gm, '')   // Remove markdown headers
      .replace(/^\s*-\s*/gm, '')    // Remove markdown list markers
      .replace(/^\s*\*\s*/gm, '')   // Remove markdown list markers
      .replace(/^\s*`\s*/gm, '')    // Remove inline code markers
      .replace(/\s*`\s*$/gm, '')    // Remove inline code markers
      .trim();
    
    console.log('🔍 [CLEAN ASSESSMENT] Output content preview:', cleaned.substring(0, 200));
    console.log('🔍 [CLEAN ASSESSMENT] Output contains HTML tags:', cleaned.includes('<') && cleaned.includes('>'));
    
    return cleaned;
  };

  // Function to create header mappings from the assessment content
  const createHeaderMappings = (assessmentContent) => {
    if (!assessmentContent) return;
    
    
    // Create a temporary DOM element to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = assessmentContent;
    
    // Find all headers (h1, h2, h3, h4)
    const headers = tempDiv.querySelectorAll('h1, h2, h3, h4');
    const newHeaderMappings = {};
    
    headers.forEach((header, index) => {
      const headerText = header.textContent.trim();
      const headerId = `header-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      newHeaderMappings[headerId] = headerText;
    });
    
    setHeaderMappings(newHeaderMappings);
  };

  // Function to add comment buttons to the assessment content
  const addCommentButtonsToAssessment = (assessmentContent) => {
    if (!assessmentContent || !headerMappings) return assessmentContent;
    
    
    let modifiedContent = assessmentContent;
    
    // Replace each header with header + comment button
    Object.entries(headerMappings).forEach(([headerId, headerText]) => {
      const headerRegex = new RegExp(`<h[1-4]>${headerText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</h[1-4]>`, 'g');
      
      modifiedContent = modifiedContent.replace(headerRegex, (match) => {
        return `<div class="header-with-comment" style="display: flex; align-items: center; justify-content: space-between; margin: 10px 0;">
          ${match}
          <button class="btn btn-sm btn-outline-primary comment-btn" 
                  onclick="window.handleAddComment('${headerId}')" 
                  style="padding: 2px 8px; font-size: 12px; margin-left: 10px;">
            ➕
          </button>
        </div>`;
      });
    });
    
    return modifiedContent;
  };

  // Function to get header text from header ID
  const getHeaderTextFromId = (headerId) => {
    const headerText = headerMappings[headerId];
    return headerText || 'Unknown Header';
  };

  // Function to format content for display
  const formatContentForDisplay = (content) => {
    if (!content) return '';
    
    console.log('🔍 [FORMAT CONTENT] Input content preview:', content.substring(0, 200));
    console.log('🔍 [FORMAT CONTENT] Contains HTML tags:', content.includes('<') && content.includes('>'));
    
    // If content is already HTML, return it as is
    if (content.includes('<') && content.includes('>')) {
      console.log('🔍 [FORMAT CONTENT] Returning HTML content as-is');
      return content;
    }
    
    console.log('🔍 [FORMAT CONTENT] Converting plain text to HTML');
    // If content is plain text, convert it to HTML
    return content
      .split('\n')
      .map(line => {
        line = line.trim();
        if (!line) return '';
        
        if (line.startsWith('Risk') && line.includes('Assessment')) {
          return `<h1>${line}</h1>`;
        } else if (line.match(/^[A-Z][a-z\s]+:$/)) {
          return `<h2>${line}</h2>`;
        } else if (line.includes(':')) {
          const [key, value] = line.split(':', 2);
          return `<p><strong>${key.trim()}:</strong> ${value.trim()}</p>`;
        } else if (line.trim()) {
          return `<p>${line}</p>`;
        }
        return '';
      })
      .filter(line => line.trim())
      .join('\n');
  };

  // Simple function to place cursor at the end of content
  const placeCursorAtEnd = () => {
    if (contentEditableRef.current) {
      try {
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(contentEditableRef.current);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      } catch (error) {
        console.warn('⚠️ [CURSOR] Error placing cursor at end:', error);
        // Just focus without setting cursor position
        contentEditableRef.current.focus();
      }
    }
  };

  // Simple function to get current cursor position
  const getCurrentCursorPosition = () => {
    if (contentEditableRef.current) {
      try {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          return {
            offset: range.startOffset,
            container: range.startContainer
          };
        }
      } catch (error) {
        // Silently fail
      }
    }
    return null;
  };

  // Simple function to set cursor position
  const setCursorPosition = (offset, container) => {
    if (contentEditableRef.current && offset !== null) {
      try {
        const range = document.createRange();
        const selection = window.getSelection();
        
        if (container && container.nodeType === Node.TEXT_NODE) {
          // Set cursor in text node
          const safeOffset = Math.min(offset, container.textContent.length);
          range.setStart(container, safeOffset);
        } else {
          // Fallback: set cursor at the end
          range.selectNodeContents(contentEditableRef.current);
          range.collapse(false);
        }
        
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      } catch (error) {
        // Silently fail
      }
    }
  };

  // Call LLM service to get updated HTML
  const callLLMService = async (prompt) => {
    try {
      console.log('🤖 [LLM] Starting Gemini LLM service call...');
      console.log('🤖 [LLM] Prompt preview:', prompt.substring(0, 200) + '...');
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [{ role: "user", content: prompt }],
          max_tokens: 4000
        })
      });
      if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
      const result = await response.json();
      console.log('🤖 [LLM] Gemini service response received:', result);
      if (result.success && result.response) {
        return { success: true, response: result.response, error: null };
      } else {
        const errorMessage = result.error || result.response || 'Gemini service failed';
        console.error('🤖 [LLM] Gemini service error response:', errorMessage);
        return { success: false, response: null, error: errorMessage };
      }
    } catch (error) {
      console.error('🤖 [LLM] Error calling Gemini service:', error);
      return { success: false, response: null, error: error.message };
    }
  };

  if (!isAuthenticated) return null;

  if (!currentGeneratedAssessment) {
    return (
      <div className="risk-results-page">
        <div className="error-container">
          <h2>No Results Found</h2>
          <p>No generated assessment was found. Please go back and generate an assessment.</p>
          <button className="btn btn-primary" onClick={handleBackToAssessment}>
            Back to Assessment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="risk-results-page">
      {/* Loading Overlay for Comment Processing */}
      {isCommentProcessing && (
        <div className="loading-spinner-overlay">
          <div className="loading-content">
            <div className="loading-ring-large"></div>
            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
              <div className="progress-percentage">{loadingProgress}%</div>
            </div>
            <div className="loading-text">
              {loadingMessage.includes('Validating') ? 'Validating Risk Assessment' : 
               loadingMessage.includes('Regenerating') ? 'Regenerating Risk Assessment' : 
               'Processing Your Comment'}
            </div>
            <div className="loading-subtext">{loadingMessage}</div>
          </div>
        </div>
      )}

      <div className="results-header">
        <button className="btn btn-secondary back-btn" onClick={() => navigate('/home')}>
          ← Back to Home
        </button>
        <div className="header-content">
          <h1>Risk Assessment Generated Successfully!</h1>
          <p>Your comprehensive risk assessment has been generated and saved to the database.</p>
        </div>
        <button className="feedback-btn" onClick={() => navigate('/feedback', { 
          state: {
            riskAssessment: riskAssessment,
            originalData: originalData,
            sowData: sowData
          }
        })}>
          FEEDBACK
        </button>
      </div>

      <div className="results-content">
        <div className="plan-section">
          <div className="plan-header">
            <h2>Generated Risk Assessment</h2>
            {!isEditing && (
              <div style={{ display: 'flex', gap: '1px' }}>
                <button className="btn btn-info btn-sm" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={handleCommentsMode}>
                  💬 Comments
                </button>
                <button className="btn btn-warning btn-sm edit-btn" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={handleEditAssessment}>
                  ✏️ Edit
                </button>
                {/* Always show SOW Doc button */}
                <button className="btn btn-success btn-sm" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setShowSowModal(true)}>
                 SOW Doc
                </button>
              </div>
            )}
          </div>
          <div className="plan-content">
            {isEditing ? (
              // Edit Mode - Large textarea for direct editing
              <div className="edit-mode">
                 <div
                   key="edit-mode-contenteditable"
                   ref={contentEditableRef}
                   className="plan-edit-contenteditable"
                   contentEditable="true"
                   onInput={handleContentChange}
                   onFocus={placeCursorAtEnd}
                   suppressContentEditableWarning={true}
                 />
                <div className="edit-actions">
                  <button 
                    className="btn btn-secondary" 
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn btn-success" 
                    onClick={handleSaveAssessment}
                    disabled={isSaving || !editedAssessment.trim()}
                  >
                    {isSaving ? '💾 Saving...' : '💾 Save Assessment'}
                  </button>
                </div>
              </div>
            ) : isCommentsMode ? (
              // Comments Mode - Display assessment with comment buttons
              <div className="comments-mode">
                <div 
                  className="gemini-html-response"
                  dangerouslySetInnerHTML={{ __html: addCommentButtonsToAssessment(formatContentForDisplay(cleanGeneratedAssessment(updatedAssessmentWithComments || currentGeneratedAssessment))) }}
                />
                <div className="edit-actions">
                  <button 
                    className="btn btn-secondary" 
                    onClick={handleCancelEdit}
                  >
                    Close Comments
                  </button>
                </div>
              </div>
            ) : (
              // View Mode - Display the generated assessment
              <div 
                dangerouslySetInnerHTML={{ __html: formatContentForDisplay(cleanGeneratedAssessment(currentGeneratedAssessment)) }}
                className="gemini-html-response"
              />
            )}
          </div>
        </div>

        <div className="user-inputs-section">
          <h2>Your Inputs Summary</h2>
          <div className="inputs-grid">
            <div className="input-group">
              <h3>I. Project Overview</h3>
              <p><strong>Project Name:</strong> {userInputs?.project_overview?.ProjectName || 'N/A'}</p>
              <p><strong>Project Dates:</strong> {userInputs?.project_overview?.ProjectDates || 'N/A'}</p>
              <p><strong>Team Name:</strong> {userInputs?.project_overview?.TeamName || 'N/A'}</p>
              <p><strong>Project Scope:</strong> {userInputs?.project_overview?.ProjectScope || 'N/A'}</p>
            </div>

            <div className="input-group">
              <h3>II. Risk Categories</h3>
              <p><strong>Number of Categories:</strong> {userInputs?.risk_categories?.RiskCategories?.length || 0}</p>
            </div>

            <div className="input-group">
              <h3>III. Stakeholders</h3>
              <p><strong>Number of Stakeholders:</strong> {userInputs?.stakeholders?.Stakeholders?.length || 0}</p>
            </div>

            <div className="input-group">
              <h3>IV. Risk Matrix</h3>
              <p>{userInputs?.risk_matrix?.RiskMatrixContent || 'N/A'}</p>
            </div>

            <div className="input-group">
              <h3>V. Risk Register</h3>
              <p>{userInputs?.risk_register?.RiskRegisterContent || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="action-buttons">
        <button className="btn btn-warning" onClick={() => setShowValidateModal(true)}>
          Validate Assessment
        </button>
        <button className="btn btn-secondary" onClick={handleBackToAssessment}>
          Generate Another Assessment
        </button>

        <button className="btn btn-success" onClick={handleDownloadAssessment}>
          📄 Download PDF
        </button>
        <button className="btn btn-primary" onClick={handleViewExistingAssessments}>
          View All Assessments
        </button>
      </div>

      {/* Comment Dialogues */}
      {Object.entries(commentDialogues).map(([headerId, isOpen]) => 
        isOpen && (
          <div key={headerId} className="comment-dialogue-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div className="comment-dialogue" style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              minWidth: '300px',
              maxWidth: '500px'
            }}>
              <h3>Add Comment</h3>
              <textarea 
                placeholder="Enter your comment here..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  margin: '10px 0',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
                id={`comment-text-${headerId}`}
              />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCommentDialogues(prev => ({ ...prev, [headerId]: false }))}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    const commentText = document.getElementById(`comment-text-${headerId}`).value;
                    if (commentText.trim()) {
                      handleSaveComment(headerId, commentText);
                    }
                  }}
                  disabled={isProcessingComment}
                >
                  {isProcessingComment ? 'Processing...' : 'Save Comment'}
                </button>
              </div>
            </div>
          </div>
        )
      )}

      {/* SOW Modal - Updated */}
      {showSowModal && (
        <div className="loading-overlay" onClick={() => setShowSowModal(false)}>
          <div className="sow-modal" onClick={(e) => e.stopPropagation()} style={{ 
            maxWidth: '1200px', 
            width: '95%', 
            background: '#fff', 
            borderRadius: '12px', 
            padding: '20px', 
            border: '1px solid #e5e7eb',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header with close button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#1f2937' }}>Check Regulations for Risk Assessment</h3>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowSowModal(false)}
                style={{ padding: '8px 16px', fontSize: '14px' }}
              >
                ✕ Close
              </button>
            </div>

            {/* Content */}
            <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden' }}>
              {/* Left Section - SOW Content Display */}
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '600', color: '#374151' }}>Current Regulations</h4>
                {existingSowText ? (
                  <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={() => setShowSowExisting(!showSowExisting)} 
                      style={{ marginBottom: '15px', alignSelf: 'flex-start' }}
                    >
                      {existingSowName}
                    </button>
                    {showSowExisting && (
                      <div style={{ 
                        flex: 1,
                        overflowY: 'auto', 
                        padding: '15px', 
                        border: '1px solid #e5e7eb', 
                        borderRadius: '8px', 
                        backgroundColor: '#f9fafb',
                        fontSize: '14px',
                        lineHeight: '1.6'
                      }}>
                        <div 
                          dangerouslySetInnerHTML={{ 
                            __html: sowData?.isHtml ? existingSowText : formatSowContentForDisplay(existingSowText)
                          }}
                          style={{ color: '#1f2937' }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <p style={{ color: '#6b7280', margin: 0, textAlign: 'center' }}>No regulations document attached for this risk assessment.</p>
                  </div>
                )}
              </div>

              {/* Right Section - SOW Upload */}
              <div style={{ width: '1px', background: '#e5e7eb' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#374151', textAlign: 'center' }}>Upload New Regulations</h4>
                <div style={{ textAlign: 'center' }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleSowUpload}
                    style={{ display: 'none' }}
                    id="sow-upload-input"
                  />
                  <button 
                    className="btn btn-primary"
                    onClick={() => document.getElementById('sow-upload-input').click()}
                    style={{ 
                      padding: '15px 30px', 
                      fontSize: '16px', 
                      fontWeight: '600',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    📄 Upload New SOW
                  </button>
                </div>
                <p style={{ color: '#6b7280', margin: 0, textAlign: 'center', fontSize: '14px', lineHeight: '1.5' }}>
                  Upload a new Statement of Work (DOCX or PDF) to replace the current one.
                </p>
              </div>
            </div>

            {/* Footer with Regenerate Plan button */}
            <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
              <button 
                className="btn btn-primary"
                onClick={handleRegenerateAssessment}
                disabled={isCommentProcessing}
                style={{ padding: '12px 24px', fontSize: '14px', fontWeight: '600' }}
              >
                {isCommentProcessing ? (
                  <>
                    <span className="loading-ring"></span>
                    Regenerating...
                  </>
                ) : (
                  '🔄 Regenerate Assessment'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validate Plan Modal - Updated */}
      {showValidateModal && (
        <div className="loading-overlay" onClick={() => setShowValidateModal(false)}>
          <div className="validate-modal" onClick={(e) => e.stopPropagation()} style={{ 
            maxWidth: '1200px', 
            width: '95%', 
            background: '#fff', 
            borderRadius: '12px', 
            padding: '20px', 
            border: '1px solid #e5e7eb',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header with close and validate buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#1f2937' }}>Validate Risk Assessment</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={handleValidatePlan}
                  style={{ padding: '8px 16px', fontSize: '14px' }}
                >
                  Validate Assessment
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setShowValidateModal(false)}
                  style={{ padding: '8px 16px', fontSize: '14px' }}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Content */}
            <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden' }}>
              {/* Left Section - Assessment Content */}
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '600', color: '#374151' }}>Generated Risk Assessment</h4>
                <div style={{ 
                  flex: 1,
                  overflowY: 'auto', 
                  padding: '15px', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px', 
                  backgroundColor: '#f9fafb',
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}>
                  <div 
                    dangerouslySetInnerHTML={{ __html: formatContentForDisplay(cleanGeneratedAssessment(currentGeneratedAssessment)) }}
                    style={{ color: '#1f2937' }}
                  />
                </div>
              </div>

              {/* Right Section - SOW Content */}
              <div style={{ width: '1px', background: '#e5e7eb' }} />
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '600', color: '#374151' }}>Regulations Document</h4>
                {existingSowText ? (
                  <div style={{ 
                    flex: 1,
                    overflowY: 'auto', 
                    padding: '15px', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px', 
                    backgroundColor: '#f9fafb',
                    fontSize: '14px',
                    lineHeight: '1.6'
                  }}>
                    <div 
                      dangerouslySetInnerHTML={{ 
                        __html: sowData?.isHtml ? existingSowText : formatSowContentForDisplay(existingSowText)
                      }}
                      style={{ color: '#1f2937' }}
                    />
                  </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <p style={{ color: '#6b7280', margin: 0, textAlign: 'center' }}>No regulations document available for validation.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation Result Modal */}
      {showValidationResult && (
        <div className="loading-overlay" onClick={() => setShowValidationResult(false)}>
          <div className="validate-modal" onClick={(e) => e.stopPropagation()} style={{ 
            maxWidth: '500px',
            width: '90%', 
            background: '#fff', 
            borderRadius: '12px', 
            padding: '30px', 
            border: '1px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>✅</div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '20px', fontWeight: '600', color: '#1f2937' }}>Validation Complete</h3>
              <p style={{ margin: 0, fontSize: '16px', color: '#4b5563', lineHeight: '1.5' }}>
                {validationResult}
              </p>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={() => setShowValidationResult(false)}
              style={{ padding: '12px 24px', fontSize: '14px', fontWeight: '600' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default RiskResultsPage;
