import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import html2pdf from 'html2pdf.js';
import './SprintResultsPage.css';

const SprintResultsPage = () => {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  // eslint-disable-next-line no-unused-vars
  void user;
  const navigate = useNavigate();
  const location = useLocation();
  
  // State for the generated plan and user inputs
  const [currentGeneratedPlan, setCurrentGeneratedPlan] = useState('');
  
  // State for editing functionality
  const [isEditing, setIsEditing] = useState(false);
  const [editedPlan, setEditedPlan] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSowModal, setShowSowModal] = useState(false);
  const [existingSowName, setExistingSowName] = useState('');
  const [existingSowText, setExistingSowText] = useState('');
  const [showSowExisting, setShowSowExisting] = useState(false);
  const [hasUploadedNewSow, setHasUploadedNewSow] = useState(false);

  // Get data from navigation state
  const { sprintPlan, originalData, sowData } = location.state || {};

  useEffect(() => {
    try {
      // Only set initial SOW content if we haven't uploaded new content AND we have SOW data from navigation
      if (!hasUploadedNewSow && sowData?.content) {
        // Only load SOW content if it was provided through navigation state (meaning it was uploaded for this sprint plan)
        const sowText = sowData.content;
        const sowName = sowData.fileName || 'Uploaded SOW';
        console.log('📄 Loading initial SOW content from navigation state:', sowText.substring(0, 100) + '...');
        setExistingSowText(sowText);
        setExistingSowName(sowName);
      } else if (!hasUploadedNewSow && !sowData?.content) {
        // Clear any existing SOW content if no SOW was provided for this sprint plan
        console.log('📄 No SOW content provided for this sprint plan, clearing existing content');
        setExistingSowText('');
        setExistingSowName('');
        // Also clear sessionStorage to prevent persistence across different sprint plans
        sessionStorage.removeItem('sowContentRaw');
        sessionStorage.removeItem('sowContentHtml');
        sessionStorage.removeItem('sowFileName');
      }
    } catch {}
  }, [sowData, hasUploadedNewSow]);
  
  // State for comments functionality
  const [isCommentsMode, setIsCommentsMode] = useState(false);
  const [commentDialogues, setCommentDialogues] = useState({});
  const [isProcessingComment, setIsProcessingComment] = useState(false);
  const [updatedPlanWithComments, setUpdatedPlanWithComments] = useState('');
  
  // State for tracking saved comments
  const [savedComments, setSavedComments] = useState({});
  const [headerMappings, setHeaderMappings] = useState({});
  
  // Ref for the contenteditable div
  const contentEditableRef = useRef(null);
  
  // Ref for the file input
  const fileInputRef = useRef(null);
  
  // State for comment processing loading
  const [isCommentProcessing, setIsCommentProcessing] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  // State for validate plan modal
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [showValidationResult, setShowValidationResult] = useState(false);
  const [validationResult, setValidationResult] = useState('');

  // State for version tracking
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [planVersions, setPlanVersions] = useState([]);
  const [currentVersionNumber, setCurrentVersionNumber] = useState(1);

  // State for share functionality
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareDescription, setShareDescription] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showSentMessage, setShowSentMessage] = useState(false);

  // Debug loading state changes
  useEffect(() => {
    console.log('🔄 isCommentProcessing state changed:', isCommentProcessing);
  }, [isCommentProcessing]);

  // Handle email sharing
  const handleSendEmail = async () => {
    if (!shareEmail || !shareEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    // Close the modal first to show loading animation
    setShowShareModal(false);
    
    // Small delay to ensure modal closes
    await new Promise(resolve => setTimeout(resolve, 200));
    
    setSendingEmail(true);
    try {
      // Get the sprint plan name (from originalData or use a default)
      const sprintPlanName = originalData?.sprint_number || 'Sprint Plan';
      
      // Create subject with format: "sprint plan shared : {sprint_plan_name}"
      const subject = `sprint plan shared : ${sprintPlanName}`;
      
      // Prepare email data
      const emailData = {
        to: shareEmail,
        subject: subject,
        body: shareDescription || 'Please find the sprint plan below.',
        sprintPlanContent: generatedPlan,
        sprintPlanName: sprintPlanName
      };

      // Get email content from backend
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/send-sprint-plan-email`, emailData);

      if (response.data.success) {
        // Close the modal first
        setShowShareModal(false);
        setShareEmail('');
        setShareDescription('');
        
        // Small delay to ensure modal closes, then show sent message
        setTimeout(() => {
          setShowSentMessage(true);
          
          // Auto hide after 3 seconds
          setTimeout(() => {
            setShowSentMessage(false);
          }, 3000);
        }, 100);
      } else {
        setSendingEmail(false); // Stop loading if failed
        alert(`❌ ${response.data.message || 'Failed to send email'}`);
      }
    } catch (error) {
      console.error('Error generating email:', error);
      alert('Failed to generate email. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };
  
  // State for SOW file upload
  // eslint-disable-next-line no-unused-vars
  const [selectedSowFile, setSelectedSowFile] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [sowFileName, setSowFileName] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [sowFileContent, setSowFileContent] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [isReadingFile, setIsReadingFile] = useState(false);
  
  // Extract the generated plan and user inputs from the sprint plan response
  const generatedPlan = sprintPlan?.response || sprintPlan?.summary || sprintPlan?.word_document;
  const userInputs = originalData;
  
  // Load the generated plan when component mounts - only once
  React.useEffect(() => {
    if (generatedPlan && planVersions.length === 0) {
      setCurrentGeneratedPlan(generatedPlan);
      // Initialize version tracking with the first version
      initializeVersionTracking(generatedPlan);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatedPlan]);

  // Initialize version tracking with the first version
  const initializeVersionTracking = (initialPlan) => {
    // Create a deep copy of the initial plan content
    // CRITICAL: Force create a NEW string copy to prevent reference sharing
    let initialContent;
    if (typeof initialPlan === 'string') {
      initialContent = String(initialPlan).slice();
    } else {
      initialContent = JSON.parse(JSON.stringify(initialPlan));
    }
    
    // Verify it's a proper copy
    console.log('📚 [VERSION] Original plan length:', initialPlan?.length || 0);
    console.log('📚 [VERSION] Initial content length:', initialContent?.length || 0);
    console.log('📚 [VERSION] Same reference?', initialPlan === initialContent);
    
    const initialVersion = {
      versionNumber: 1,
      content: initialContent,
      timestamp: new Date().toLocaleString(),
      action: 'Initial Generation',
      description: 'Sprint plan generated successfully'
    };
    setPlanVersions([initialVersion]);
    setCurrentVersionNumber(1);
    console.log('📚 [VERSION] Initialized version tracking with version 1');
    console.log('📚 [VERSION] Stored content length:', initialContent?.length || 0);
  };

  // Add new version to tracking
  const addNewVersion = (content, action, description) => {
    setPlanVersions(prev => {
      const newVersionNumber = prev.length > 0 ? prev[prev.length - 1].versionNumber + 1 : currentVersionNumber + 1;
      
      // Create a deep copy of the content to avoid reference issues
      // CRITICAL: Always create a NEW string copy to prevent reference sharing
      let contentCopy;
      if (typeof content === 'string') {
        // Force create a new string via String() and slice()
        contentCopy = String(content).slice();
      } else {
        contentCopy = JSON.parse(JSON.stringify(content));
      }
      
      // Double-check we have a proper copy (not a reference)
      console.log(`📚 [VERSION] Original content length: ${content?.length || 0}`);
      console.log(`📚 [VERSION] Copy content length: ${contentCopy?.length || 0}`);
      console.log(`📚 [VERSION] Same reference? ${content === contentCopy}`);
      
      const newVersion = {
        versionNumber: newVersionNumber,
        content: contentCopy,
        timestamp: new Date().toLocaleString(),
        action: action,
        description: description
      };
      
      // Create a new array with a new object, don't mutate
      const updatedVersions = [...prev, newVersion];
      setCurrentVersionNumber(newVersionNumber);
      
      console.log(`📚 [VERSION] Added version ${newVersionNumber}: ${action} - ${description}`);
      console.log(`📚 [VERSION] Total versions: ${updatedVersions.length}`);
      console.log(`📚 [VERSION] Stored content length: ${contentCopy?.length || 0}`);
      
      return updatedVersions;
    });
  };

  // Handle version modal
  const handleVersionModal = () => {
    setShowVersionModal(true);
  };
  
  // Create header mappings when entering comments mode
  React.useEffect(() => {
    if (isCommentsMode && currentGeneratedPlan) {
      createHeaderMappings(currentGeneratedPlan);
    }
  }, [isCommentsMode, currentGeneratedPlan]);
  
  // Make comment functions available globally for inline onclick handlers
  React.useEffect(() => {
    window.handleAddComment = handleAddComment;
    window.handleSaveComment = handleSaveComment;
    
    return () => {
      delete window.handleAddComment;
      delete window.handleSaveComment;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Authentication check
  React.useEffect(() => {
    // Only redirect if not loading and not authenticated
    if (!authLoading && !isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Global error handler
  React.useEffect(() => {
    const handleError = (error) => {
      console.error('🚨 [GLOBAL ERROR] Caught error:', error);
      // Prevent the error from showing in the console
      error.preventDefault();
      return false;
    };

    const handleUnhandledRejection = (event) => {
      console.error('🚨 [GLOBAL ERROR] Unhandled promise rejection:', event.reason);
      // Prevent the error from showing in the console
      event.preventDefault();
      return false;
    };

    // No selection change handler - keep it simple

    // No complex mutation observer - keep it simple

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    // No selection change listener

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      // No selection change listener to clean up
      
      // No mutation observer to clean up
    };
  }, [isEditing]);

  // Effect to handle edit mode focus and cursor position
  useEffect(() => {
    if (isEditing && contentEditableRef.current) {
      // Don't interfere with the contenteditable - let handleEditPlan handle it
      // This prevents conflicts with the direct DOM manipulation
    }
    
    // Cleanup function to clear timeout
    return () => {
      if (window.contentChangeTimeout) {
        clearTimeout(window.contentChangeTimeout);
      }
    };
  }, [isEditing]);

  // Debug logging
  console.log('SprintResultsPage - Location State:', location.state);
  console.log('SprintResultsPage - SprintPlan:', sprintPlan);
  console.log('SprintResultsPage - OriginalData:', originalData);
  console.log('SprintResultsPage - GeneratedPlan:', generatedPlan);
  console.log('SprintResultsPage - CurrentGeneratedPlan:', currentGeneratedPlan);
  console.log('SprintResultsPage - UserInputs:', userInputs);
  console.log('SprintResultsPage - SprintPlan fields:', {
    id: sprintPlan?.id,
    response: sprintPlan?.response,
    summary: sprintPlan?.summary,
    word_document: sprintPlan?.word_document
  });

  const handleBackToPlanning = () => {
    navigate('/sprint-planning');
  };

  const handleViewExistingPlans = () => {
    navigate('/existing-plans');
  };

  // Handle SOW file upload
  const handleSowUpload = () => {
    fileInputRef.current?.click();
  };

  // Handle validating the sprint plan
  const handleValidatePlan = async () => {
    try {
      console.log('✅ Starting plan validation...');
      
      // Get the current sprint plan content
      const currentPlanContent = currentGeneratedPlan || sprintPlan?.response || sprintPlan?.summary || sprintPlan?.word_document || '';
      
      // Get the SOW content for validation
      const sowContent = existingSowText || sessionStorage.getItem('sowContentHtml') || sessionStorage.getItem('sowContentRaw') || '';

      if (!currentPlanContent) {
        alert('Error: No sprint plan content found for validation.');
        return;
      }

      if (!sowContent) {
        alert('Error: No SOW content found for validation. Please upload a SOW document first.');
        return;
      }

      // Show loading state
      console.log('🔄 Setting loading state for validation...');
      setIsCommentProcessing(true);
      setLoadingMessage('Validating plan against SOW...');
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

      console.log('✅ Validating plan against SOW:', {
        planContent: currentPlanContent ? 'Present' : 'Not found',
        sowContent: sowContent ? 'Present' : 'Not found'
      });

      // Call backend validation endpoint
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/sprint/validate-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sprint_plan_content: currentPlanContent,
          sow_content: sowContent
        })
      });

      const result = await response.json();

      // Complete progress
      setLoadingProgress(100);
      setTimeout(() => {
        setIsCommentProcessing(false);
        setLoadingProgress(0);
        setLoadingMessage('');
      }, 500);

      if (result.success) {
        console.log('✅ Plan validation completed successfully!');
        
        // Extract percentage from the response
        const validationResponse = result.response || '';
        const percentageMatch = validationResponse.match(/(\d+)%/);
        const percentage = percentageMatch ? percentageMatch[1] : '0';
        
        // Set validation result and show modal
        setValidationResult(`Generated plan ${percentage}% aligned with the SOW.`);
        setShowValidationResult(true);
        
        // Close the validate modal
        setShowValidateModal(false);
      } else {
        console.error('❌ Error validating plan:', result.error);
        setValidationResult(`Error: ${result.error}`);
        setShowValidationResult(true);
        setShowValidateModal(false);
      }
      
    } catch (error) {
      console.error('❌ Error validating plan:', error);
      setIsCommentProcessing(false);
      setLoadingProgress(0);
      setLoadingMessage('');
      setValidationResult(`Error validating plan: ${error.message}`);
      setShowValidationResult(true);
      setShowValidateModal(false);
    }
  };

  // Handle regenerating the sprint plan
  const handleRegeneratePlan = async () => {
    try {
      console.log('🔄 Starting plan regeneration with current plan and latest SOW...');
      
      // Get the current sprint plan ID
      const sprintPlanId = sprintPlan?.plan_id || sprintPlan?.id;
      
      if (!sprintPlanId) {
        alert('Error: No sprint plan ID found. Cannot regenerate plan.');
        return;
      }

      // Get the updated SOW content (if any new SOW was uploaded)
      const updatedSowContent = sessionStorage.getItem('sowContentHtml') || sessionStorage.getItem('sowContentRaw') || originalData?.sow_content;
      
      // Get the current generated plan content
      const currentPlanContent = currentGeneratedPlan || sprintPlan?.response || sprintPlan?.summary || sprintPlan?.word_document || '';

      if (!currentPlanContent) {
        alert('Error: No current plan content found. Cannot regenerate plan.');
        return;
      }

      // Show loading state
      console.log('🔄 Setting loading state for regeneration...');
      setIsCommentProcessing(true);
      setLoadingMessage('Regenerating sprint plan...');
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

      // Prepare the regeneration request with both current plan and updated SOW content
      const regenerationData = {
        ...originalData,
        sow_content: updatedSowContent,
        current_plan_content: currentPlanContent, // Include current plan for fine-tuning
        user_email: originalData?.user_email || 'unknown@example.com',
        regenerate_with_current_plan: true // Flag to indicate this is a regeneration
      };

      console.log('🔄 Regenerating plan with current plan and latest SOW:', {
        sowContent: updatedSowContent ? 'Present' : 'Not found',
        currentPlanContent: currentPlanContent ? 'Present' : 'Not found',
        originalData: originalData
      });

      // Call the backend to regenerate the plan
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/sprint/generate-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(regenerationData)
      });

      const result = await response.json();

      // Complete progress
      setLoadingProgress(100);
      setTimeout(() => {
        setIsCommentProcessing(false);
        setLoadingProgress(0);
        setLoadingMessage('');
      }, 500);

      if (result.success) {
        console.log('✅ Plan regenerated successfully with current plan and latest SOW!');
        
        // Update the current plan with the new generated content
        const regeneratedContent = result.response || result.summary || result.word_document;
        setCurrentGeneratedPlan(regeneratedContent);
        
        // Add new version for the regeneration
        addNewVersion(regeneratedContent, 'SOW Regeneration', 'Plan regenerated with updated SOW content');
        
        // Close the modal
        setShowSowModal(false);
        
        // Success - no popup needed, user can see the updated plan
      } else {
        console.error('❌ Error regenerating plan:', result.error);
        alert(`Error regenerating plan: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error regenerating plan:', error);
      setIsCommentProcessing(false);
      setLoadingProgress(0);
      setLoadingMessage('');
      alert(`Error regenerating plan: ${error.message}`);
    }
  };

  // Auto-save new SOW content to database
  const autoSaveNewSow = async (sowContent, fileName) => {
    try {
      // Debug: Check what's available in sprintPlan
      console.log('💾 Sprint Plan object:', sprintPlan);
      console.log('💾 Sprint Plan keys:', Object.keys(sprintPlan || {}));
      console.log('💾 Sprint Plan ID (id):', sprintPlan?.id);
      console.log('💾 Sprint Plan ID (plan_id):', sprintPlan?.plan_id);
      
      // Get the current sprint plan ID from the navigation state
      const sprintPlanId = sprintPlan?.plan_id || sprintPlan?.id;
      
      if (!sprintPlanId) {
        console.log('💾 Available sprint plan data:', JSON.stringify(sprintPlan, null, 2));
        alert('Error: No sprint plan ID found. Cannot save SOW content.');
        return;
      }

      if (!sowContent) {
        console.log('💾 No SOW content to save.');
        return;
      }

      console.log('💾 Saving new SOW content to database...');
      console.log('💾 Sprint Plan ID:', sprintPlanId);
      console.log('💾 SOW Content length:', sowContent.length);

      // Call backend API to update SOW content
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/sprint/update-sow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sprint_plan_id: sprintPlanId,
          sow_content: sowContent,
          sow_file_name: fileName
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ SOW content auto-saved successfully!');
      } else {
        console.error('❌ Error auto-saving SOW content:', result.error);
      }
    } catch (error) {
      console.error('❌ Error saving SOW content:', error);
      alert(`Error saving SOW content: ${error.message}`);
    }
  };

  // Test backend connectivity - removed as it was causing 400 errors with empty FormData

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file type
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/pdf', // .pdf
        'application/msword' // .doc
      ];
      
      const fileExtension = file.name.toLowerCase().split('.').pop();
      const isValidType = allowedTypes.includes(file.type) || ['docx', 'pdf', 'doc'].includes(fileExtension);
      
      if (isValidType) {
        setSelectedSowFile(file);
        setSowFileName(file.name);
        setIsReadingFile(true);
        setSowFileContent('');
        
        console.log('📄 SOW file selected:', file.name, 'Type:', file.type, 'Size:', file.size);
        
        try {
          // Read file content based on file type
          if (fileExtension === 'pdf') {
            await readPDFContent(file);
          } else if (['docx', 'doc'].includes(fileExtension)) {
            await readDOCXContent(file);
          }
        } catch (error) {
          console.error('❌ Error reading file content:', error);
          setSowFileContent(`Error reading file content: ${error.message}`);
        } finally {
          setIsReadingFile(false);
        }
      } else {
        alert('Please select a valid DOCX or PDF file.');
        // Reset the input
        event.target.value = '';
      }
    }
  };

  // Read PDF content using existing SOW upload endpoint
  const readPDFContent = async (file) => {
    try {
      console.log('📄 Starting PDF content extraction for:', file.name);
      
      // Use the same approach as the working SOW upload in HomePage
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/upload/sow`, {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      console.log('📄 PDF upload result:', result);
      console.log('📄 PDF result.data:', result.data);
      console.log('📄 PDF result.data.rawText:', result.data?.rawText);
      
      if (result.success) {
        // The API returns the data in result.data
        const textContent = result.data?.rawText || '';
        setSowFileContent(textContent);
        
        // Update the existing SOW content in the modal
        console.log('📄 Setting existing SOW text:', textContent.substring(0, 100) + '...');
        setExistingSowText(textContent);
        setExistingSowName(file.name);
        setHasUploadedNewSow(true); // Mark that we've uploaded new content
        // Store in sessionStorage for persistence
        sessionStorage.setItem('sowContentRaw', textContent);
        sessionStorage.setItem('sowFileName', file.name);
        console.log('📄 Updated existingSowText and existingSowName');
        console.log('📄 hasUploadedNewSow set to:', true);
        
        // Auto-save the new SOW content
        await autoSaveNewSow(textContent, file.name);
        
        console.log('📄 PDF content extracted successfully, length:', textContent?.length);
      } else {
        const errorMsg = `Error extracting PDF content: ${result.error}`;
        setSowFileContent(errorMsg);
        console.error('📄 PDF extraction failed:', errorMsg);
      }
    } catch (error) {
      console.error('📄 PDF extraction error:', error);
      setSowFileContent(`Network Error: ${error.message}`);
    }
  };

  // Read DOCX content using existing SOW upload endpoint
  const readDOCXContent = async (file) => {
    try {
      console.log('📄 Starting DOCX content extraction for:', file.name);
      
      // Use the same approach as the working SOW upload in HomePage
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/upload/sow`, {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      console.log('📄 DOCX upload result:', result);
      console.log('📄 DOCX result.data:', result.data);
      console.log('📄 DOCX result.data.rawText:', result.data?.rawText);
      console.log('📄 DOCX result.data.htmlContent:', result.data?.htmlContent);
      
      if (result.success) {
        // The API returns the data in result.data
        const textContent = result.data?.rawText || '';
        const htmlContent = result.data?.htmlContent || '';
        
        setSowFileContent(textContent);
        
        // Update the existing SOW content in the modal if HTML is available
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
        
        // Auto-save the new SOW content (prefer HTML over text)
        const contentToSave = htmlContent || textContent;
        await autoSaveNewSow(contentToSave, file.name);
        
        console.log('📄 DOCX content extracted successfully, length:', textContent?.length);
        console.log('📄 HTML content available:', !!htmlContent);
      } else {
        const errorMsg = `Error extracting DOCX content: ${result.error}`;
        setSowFileContent(errorMsg);
        console.error('📄 DOCX extraction failed:', errorMsg);
      }
    } catch (error) {
      console.error('📄 DOCX extraction error:', error);
      setSowFileContent(`Network Error: ${error.message}`);
    }
  };

  // Edit Plan functionality
  const handleEditPlan = () => {
    setIsEditing(true);
    setIsCommentsMode(false);
    
    console.log('✏️ [EDIT PLAN] Starting edit process...');
    console.log('✏️ [EDIT PLAN] CurrentGeneratedPlan type:', typeof currentGeneratedPlan);
    console.log('✏️ [EDIT PLAN] CurrentGeneratedPlan length:', currentGeneratedPlan?.length || 0);
    console.log('✏️ [EDIT PLAN] CurrentGeneratedPlan preview:', currentGeneratedPlan?.substring(0, 200));
    
    // Get the content exactly as it appears in the current generated plan
    let editContent = '';
    
    if (currentGeneratedPlan) {
      console.log('✏️ [EDIT PLAN] Processing currentGeneratedPlan content...');
      
      // Remove only markdown code blocks, keep HTML formatting
      editContent = currentGeneratedPlan
        .replace(/```html\s*/gi, '')
        .replace(/```\s*$/gi, '')
        .replace(/^```.*$/gm, '')
        .trim();
      
      console.log('✏️ [EDIT PLAN] After markdown removal:', editContent.substring(0, 200));
      
      // If no content after markdown removal, use the original
      if (!editContent.trim()) {
        editContent = currentGeneratedPlan;
      }
    } else {
      console.log('❌ [EDIT PLAN] No currentGeneratedPlan available!');
      
      // Try to get content from the currently displayed plan as fallback
      const displayedContent = document.querySelector('.gemini-html-response');
      if (displayedContent) {
        editContent = displayedContent.innerHTML || displayedContent.outerHTML || '';
        console.log('✏️ [EDIT PLAN] Fallback: Got content from displayed plan:', editContent.substring(0, 200));
      }
    }
    
    console.log('✏️ [EDIT PLAN] Final content for editing (with HTML):', editContent);
    setEditedPlan(editContent);
    
    // Use setTimeout to ensure DOM is updated before setting content
    setTimeout(() => {
      if (contentEditableRef.current) {
        contentEditableRef.current.innerHTML = editContent;
        // Don't automatically move cursor to end - let user click where they want to edit
      }
    }, 100);
  };

  const handleCommentsMode = () => {
    setIsCommentsMode(true);
    setIsEditing(false);
    setUpdatedPlanWithComments(currentGeneratedPlan);
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
        { progress: 35, message: "Processing team capacity..." },
        { progress: 55, message: "Evaluating sprint data..." },
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
      
      // Get the header text from the plan
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
      
      // Get the current HTML content from generated_plan
      const currentHtmlContent = currentGeneratedPlan;
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
        
        // Overwrite the existing generated_plan with new HTML
        const updatedHtml = response.response;
        
        // Check if content actually changed
        const hasChanged = currentGeneratedPlan !== updatedHtml;
        console.log('💾 [LLM] Content changed:', hasChanged);
        console.log('💾 [LLM] Current plan length:', currentGeneratedPlan?.length || 0);
        console.log('💾 [LLM] Updated HTML length:', updatedHtml?.length || 0);
        console.log('💾 [LLM] Content is same object?', currentGeneratedPlan === updatedHtml);
        
        // Create a DEEP copy to avoid reference issues with stored versions
        // IMPORTANT: Always create a fresh string copy, never reuse references
        const htmlCopy = String(updatedHtml).slice(); // Ensure it's a string and create new copy
        
        // Verify it's a different reference
        console.log('💾 [LLM] HTML copy is same as original?', htmlCopy === updatedHtml);
        console.log('💾 [LLM] HTML copy length:', htmlCopy?.length || 0);
        
        // Update the current generated plan with the copied content
        setCurrentGeneratedPlan(htmlCopy);
        
        // Also update the updatedPlanWithComments for consistency
        setUpdatedPlanWithComments(htmlCopy);
        
        // Only add new version if content actually changed
        if (hasChanged) {
          // Pass the copy to addNewVersion to ensure it stores an independent copy
          addNewVersion(htmlCopy, 'AI Comment Edit', `Plan updated based on comment: "${comment.trim()}"`);
        } else {
          console.log('💾 [LLM] No changes detected, skipping version creation');
        }
        
        console.log('💾 [LLM] Generated plan updated with new HTML content');
        
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
    setEditedPlan('');
    
    // Reset the contenteditable div to the original content
    if (contentEditableRef.current) {
      contentEditableRef.current.innerHTML = formatContentForDisplay(cleanGeneratedPlan(currentGeneratedPlan));
    }
  };

  const handleSavePlan = async () => {
    if (!editedPlan.trim()) {
      alert('Please enter plan content before saving.');
      return;
    }

    setIsSaving(true);
    try {
      // Update the local state immediately for better UX
      const updatedPlan = editedPlan.trim();
      
      console.log('💾 [SAVE PLAN] Saving edited plan:', updatedPlan);
      
      // Clean the plan content to remove any unwanted HTML artifacts
      const cleanedPlan = cleanGeneratedPlan(updatedPlan);
      
      console.log('💾 [SAVE PLAN] Original edited plan:', updatedPlan.substring(0, 200));
      console.log('💾 [SAVE PLAN] Final cleaned plan:', cleanedPlan.substring(0, 200));
      
      // Check if content actually changed
      const hasChanged = currentGeneratedPlan !== cleanedPlan;
      console.log('💾 [SAVE PLAN] Content changed:', hasChanged);
      console.log('💾 [SAVE PLAN] Current plan length:', currentGeneratedPlan?.length || 0);
      console.log('💾 [SAVE PLAN] Cleaned plan length:', cleanedPlan?.length || 0);
      console.log('💾 [SAVE PLAN] Content is same object?', currentGeneratedPlan === cleanedPlan);
      
      // Create a DEEP copy to avoid reference issues with stored versions
      // IMPORTANT: Always create a fresh string copy, never reuse references
      const planCopy = String(cleanedPlan).slice(); // Ensure it's a string and create new copy
      
      // Verify it's a different reference
      console.log('💾 [SAVE PLAN] Plan copy is same as original?', planCopy === cleanedPlan);
      console.log('💾 [SAVE PLAN] Plan copy length:', planCopy?.length || 0);
      
      // Update the current generated plan with the copied content
      setCurrentGeneratedPlan(planCopy);
      
      // Only add new version if content actually changed
      if (hasChanged) {
        // Pass the copy to addNewVersion to ensure it stores an independent copy
        addNewVersion(planCopy, 'Manual Edit', 'Plan edited manually by user');
      } else {
        console.log('💾 [SAVE PLAN] No changes detected, skipping version creation');
      }
      
      // Here you would typically save to backend
      // For now, we'll just update the local state
      console.log('💾 [SAVE PLAN] Plan updated successfully in local state');
      
      // Success message removed - no more popup
      
      // Exit edit mode
      setIsEditing(false);
      setEditedPlan('');
      
    } catch (error) {
      console.error('❌ [SAVE PLAN] Error saving plan:', error);
      alert(`Error saving plan: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle content changes in the contenteditable div
  const handleContentChange = (e) => {
    try {
      // Get the HTML content to preserve formatting
      const htmlContent = e.target.innerHTML || e.target.outerHTML || '';
      
      // Store the content in state but don't re-render the contenteditable div
      setEditedPlan(htmlContent);
      
      // Log only occasionally to avoid console spam
      if (Math.random() < 0.1) { // Log only 10% of the time
        console.log('✏️ [CONTENT CHANGE] HTML content length:', htmlContent.length);
      }
    } catch (error) {
      console.warn('⚠️ [CONTENT CHANGE] Error handling content change:', error);
      // Fallback: update with current content
      setEditedPlan(e.target.innerHTML || '');
    }
  };

 

  const handleDownloadPlan = () => {
    try {
      console.log('📄 Starting PDF generation for Sprint Results');
      console.log('📄 User inputs:', userInputs);
      console.log('📄 Current generated plan:', currentGeneratedPlan);
      
      // Get the cleaned HTML content directly
      let cleanHtml = currentGeneratedPlan || '';
      
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
          <title>Sprint Plan - ${userInputs?.sprint_overview?.SprintNumber || 'N/A'}</title>
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
          filename: `sprint-plan-${userInputs?.sprint_overview?.SprintNumber || 'N/A'}-${new Date().toISOString().split('T')[0]}.pdf`,
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

  // eslint-disable-next-line no-unused-vars
  const generatePDFContent = () => {
    console.log('📄 Generating PDF content for Sprint Results');
    console.log('📄 User inputs in generatePDFContent:', userInputs);
    console.log('📄 Current generated plan in generatePDFContent:', currentGeneratedPlan);
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sprint Plan - ${userInputs?.sprint_overview?.SprintNumber || 'N/A'}</title>
        <style>
          @page {
            size: A4;
            margin: 18mm 14mm;
          }
          
          body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
            color: #2c3e50;
            line-height: 1.6;
            font-size: 11pt;
          }
          
          .container {
            max-width: 100%;
            margin: 0 auto;
          }
          
          .sprint-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            text-align: center;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          }
          
          .sprint-header h1 {
            margin: 0 0 10px 0;
            font-size: 2.5em;
            font-weight: 700;
          }
          
          .sprint-header p {
            margin: 0;
            opacity: 0.9;
            font-size: 1.1em;
          }
          
          .plan-section {
            background: white;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 25px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            border-left: 4px solid #e53e3e;
          }
          
          .plan-section h2 {
            color: #2d3748;
            margin: 0 0 20px 0;
            font-size: 1.5em;
            font-weight: 600;
          }
          
          .info-box {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
          }
          
          .info-box h3 {
            margin: 0 0 10px 0;
            color: #2d3748;
            font-size: 1.2em;
            font-weight: 600;
          }
          
          .info-box p {
            margin: 0 0 10px 0;
            line-height: 1.6;
          }
          
          .info-box p:last-child {
            margin-bottom: 0;
          }
          
          .generated-plan {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 25px;
            margin-top: 20px;
          }
          
          .generated-plan h2, .generated-plan h3, .generated-plan h4 {
            color: #2d3748;
            margin: 20px 0 15px 0;
            font-weight: 600;
          }
          
          .generated-plan h2 {
            font-size: 1.4em;
            color: #1a202c;
          }
          
          .generated-plan h3 {
            font-size: 1.2em;
            color: #2d3748;
          }
          
          .generated-plan h4 {
            font-size: 1.1em;
            color: #4a5568;
          }
          
          .generated-plan p {
            margin: 12px 0;
            line-height: 1.6;
            color: #4a5568;
          }
          
          .generated-plan ul, .generated-plan ol {
            margin: 15px 0;
            padding-left: 25px;
          }
          
          .generated-plan li {
            margin: 8px 0;
            line-height: 1.6;
            color: #4a5568;
          }
          
          .generated-plan strong {
            color: #2d3748;
            font-weight: 600;
          }
          
          .generated-plan em {
            color: #718096;
            font-style: italic;
          }
          
          .page-break {
            page-break-before: always;
          }
          
          .footer {
            text-align: center;
            padding: 30px;
            color: #718096;
            font-size: 0.9em;
            border-top: 1px solid #e2e8f0;
            margin-top: 40px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Sprint Header -->
          <div class="sprint-header">
            <h1>Sprint Plan - Sprint ${userInputs?.sprint_overview?.SprintNumber || 'N/A'}</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>
          
          <!-- Generated Sprint Plan -->
          <div class="plan-section">
            <h2>Generated Sprint Plan</h2>
            <div class="generated-plan">
              ${currentGeneratedPlan ? cleanGeneratedPlan(currentGeneratedPlan) : '<p>No generated plan available.</p>'}
            </div>
          </div>
          
          <!-- User Inputs Summary -->
          <div class="plan-section page-break">
            <h2>Your Inputs Summary</h2>
            <div class="plan-content">
              <div class="info-box">
                <h3>I. Sprint Overview</h3>
                <p><strong>Sprint Number:</strong> ${userInputs?.sprint_overview?.SprintNumber || 'N/A'}</p>
                <p><strong>Sprint Dates:</strong> ${userInputs?.sprint_overview?.SprintDates || 'N/A'}</p>
                <p><strong>Team Name:</strong> ${userInputs?.sprint_overview?.TeamName || 'N/A'}</p>
                <p><strong>Sprint Goal:</strong> ${userInputs?.sprint_overview?.SprintGoal || 'N/A'}</p>
              </div>
              
              <div class="info-box">
                <h3>II. Team Capacity</h3>
                <p><strong>Total Hours per Person:</strong> ${userInputs?.team_capacity?.TotalHoursPerPerson || 'N/A'}</p>
                <p><strong>Number of Members:</strong> ${userInputs?.team_capacity?.NumberOfMembers || 'N/A'}</p>
                <p><strong>Historical Story Points:</strong> ${userInputs?.team_capacity?.HistoricalStoryPoints || 'N/A'}</p>
              </div>
              
              <div class="info-box">
                <h3>III. Product Backlog Items</h3>
                <p><strong>Number of Items:</strong> ${userInputs?.product_backlog?.BacklogItems?.length || 0}</p>
              </div>
              
              <div class="info-box">
                <h3>IV. Definition of Done</h3>
                <p>${userInputs?.definition_of_done?.DoDContent || 'N/A'}</p>
              </div>
              
              <div class="info-box">
                <h3>V. Risks & Impediments</h3>
                <p>${userInputs?.risks_and_impediments?.RisksContent || 'N/A'}</p>
              </div>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <p>This sprint plan was automatically generated by the Sprint Planning System</p>
            <p>Document ID: SP-${userInputs?.sprint_overview?.SprintNumber || 'N/A'}-${new Date().toISOString().split('T')[0]}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    console.log('📄 Final HTML content length:', htmlContent.length);
    return htmlContent;
  };

     const cleanGeneratedPlan = (planContent) => {
     if (!planContent) return '';
     
     // Remove markdown code blocks but preserve HTML formatting
     let cleaned = planContent
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

     // Remove any SOW section from the generated HTML (titles like 'Statement of Work (SOW) Context')
     try {
       const sowSectionRegex = /<h[1-4][^>]*>[^<]*(statement\s*of\s*work|\bSOW\b)[^<]*<\/h[1-4]>[\s\S]*?(?=<h[1-4][^>]*>|$)/i;
       cleaned = cleaned.replace(sowSectionRegex, '');
     } catch {}
     
     return cleaned;
   };

  // Function to create header mappings from the plan content
  const createHeaderMappings = (planContent) => {
    if (!planContent) return;
    
    
    // Create a temporary DOM element to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = planContent;
    
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

  // Function to add comment buttons to the plan content
  const addCommentButtonsToPlan = (planContent) => {
    if (!planContent || !headerMappings) return planContent;
    
    
    let modifiedContent = planContent;
    
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

  // Function to format SOW content for display
  const formatSowContentForDisplay = (content) => {
    if (!content) return '';
    
    // If content is already HTML, return it as is
    if (content.includes('<') && content.includes('>')) {
      return content;
    }
    
    // Split content into lines and process each line
    const lines = content.split('\n');
    let formattedContent = '';
    let inBulletList = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        if (inBulletList) {
          formattedContent += '</ul>';
          inBulletList = false;
        }
        formattedContent += '<br>';
        continue;
      }
      
      // Check for main title (usually the first line or contains "Rules & Regulations")
      if (i === 0 || line.toLowerCase().includes('rules') || line.toLowerCase().includes('regulations')) {
        formattedContent += `<h1 style="color: #1f2937; font-size: 24px; font-weight: bold; margin: 20px 0 15px 0; text-align: center;">${line}</h1>`;
      }
      // Check for numbered sections (e.g., "1. Testing new doc Scope Adherence")
      // eslint-disable-next-line no-useless-escape
      else if (line.match(/^\d+\.\s+.+/)) {
        if (inBulletList) {
          formattedContent += '</ul>';
          inBulletList = false;
        }
        const sectionText = line.replace(/^\d+\.\s+/, '');
        // eslint-disable-next-line no-unused-vars
        void sectionText;
        formattedContent += `<h2 style="color: #1f2937; font-size: 18px; font-weight: bold; margin: 20px 0 10px 0;">${line}</h2>`;
      }
      // Check for bullet points (lines starting with • or - or * or indented)
      // eslint-disable-next-line no-useless-escape
      else if (line.match(/^[•\-\*]\s+/) || line.startsWith('  ') || line.startsWith('\t')) {
        if (!inBulletList) {
          formattedContent += '<ul style="margin: 10px 0; padding-left: 20px;">';
          inBulletList = true;
        }
        // eslint-disable-next-line no-useless-escape
        const bulletText = line.replace(/^[•\-\*]\s+/, '').replace(/^\s+/, '');
        // eslint-disable-next-line no-useless-escape
        // Check for bold text within bullet points (like "80%")
        // eslint-disable-next-line no-useless-escape
        const formattedBulletText = bulletText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // eslint-disable-next-line no-unused-vars
        void formattedBulletText;
        formattedContent += `<li style="color: #1f2937; margin: 5px 0; line-height: 1.5;">${formattedBulletText}</li>`;
      }
      // Regular paragraphs
      else {
        if (inBulletList) {
          formattedContent += '</ul>';
          inBulletList = false;
        }
        formattedContent += `<p style="color: #1f2937; margin: 10px 0; line-height: 1.5;">${line}</p>`;
      }
    }
    
    // Close any remaining bullet list
    if (inBulletList) {
      formattedContent += '</ul>';
    }
    
    return formattedContent;
  };

  // Function to format content for display
  const formatContentForDisplay = (content) => {
    if (!content) return '';
    
    // If content is already HTML, return it as is
    if (content.includes('<') && content.includes('>')) {
      return content;
    }
    
    // If content is plain text, convert it to HTML
    return content
      .split('\n')
      .map(line => {
        line = line.trim();
        if (!line) return '';
        
        if (line.startsWith('Sprint') && line.includes('Plan')) {
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

  // Simple function to place cursor at the end of content (only when explicitly needed)
  // eslint-disable-next-line no-unused-vars
  const placeCursorAtEnd = () => {
    if (contentEditableRef.current) {
      try {
        // Check if there's already a selection/cursor position
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          // User already has a cursor position, don't move it
          return;
        }
        
        const range = document.createRange();
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
  // eslint-disable-next-line no-unused-vars
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
  // eslint-disable-next-line no-unused-vars
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
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/gemini/chat`, {
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

  if (!currentGeneratedPlan) {
    return (
      <div className="sprint-results-page">
        <div className="error-container">
          <h2>No Results Found</h2>
          <p>No generated plan was found. Please go back and generate a plan.</p>
          <button className="btn btn-primary" onClick={handleBackToPlanning}>
            Back to Planning
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sprint-results-page">
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
              {loadingMessage.includes('Validating') ? 'Validating Sprint Plan' : 
               loadingMessage.includes('Regenerating') ? 'Regenerating Sprint Plan' : 
               'Processing Your Comment'}
            </div>
            <div className="loading-subtext">{loadingMessage}</div>
          </div>
        </div>
      )}

      {/* Error Boundary */}
      {window.location.href.includes('error') && (
        <div style={{ 
          background: '#fee', 
          border: '1px solid #fcc', 
          padding: '10px', 
          margin: '10px 0', 
          borderRadius: '4px',
          color: '#c33'
        }}>
          <strong>⚠️ Error Detected:</strong> Please refresh the page and try again.
        </div>
      )}

      <div className="results-header">
        <button className="btn btn-secondary back-btn" onClick={() => navigate('/home')}>
          ← Back to Home
        </button>
        <div className="header-content">
          <h1>Sprint Plan Generated Successfully!</h1>
          <p>Your comprehensive sprint plan has been generated and saved to the database.</p>
        </div>
        <div className="header-actions">
          <button className="feedback-btn" onClick={() => navigate('/feedback', { 
            state: {
              sprintPlan: sprintPlan,
              originalData: originalData,
              sowData: sowData
            }
          })}>
            FEEDBACK
          </button>
          <button className="share-btn" onClick={() => setShowShareModal(true)}>
            SHARE
          </button>
        </div>
      </div>



             <div className="results-content">
         <div className="plan-section">
           <div className="plan-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
             <h2 style={{ margin: 0 }}>Generated Sprint Plan</h2>
             {!isEditing && (
               <div style={{ display: 'flex', gap: '2px' }}>
                 <button className="btn btn-info btn-sm" style={{ padding: '4px 8px', fontSize: '10px' }} onClick={handleCommentsMode}>
                   💬 Comments
                 </button>
                 <button className="btn btn-warning btn-sm edit-btn" style={{ padding: '4px 8px', fontSize: '10px' }} onClick={handleEditPlan}>
                   ✏️ Edit
                 </button>
                 <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', fontSize: '10px' }} onClick={() => setShowSowModal(true)}>
                  SOW Doc
                 </button>
                 <button className="btn btn-primary btn-sm" style={{ padding: '4px 8px', fontSize: '10px' }} onClick={handleVersionModal}>
                   📚 Version {currentVersionNumber}
                 </button>
               </div>
             )}
           </div>
           <div className="plan-content">
             {isEditing ? (
               // Edit Mode - Large textarea for direct editing
               <div className="edit-mode">
                  <div
                    key={`edit-mode-contenteditable-${isEditing}`}
                    ref={contentEditableRef}
                    className="plan-edit-contenteditable"
                    contentEditable="true"
                    onInput={handleContentChange}
                    onFocus={() => {
                      // Don't automatically move cursor to end
                      // Let the user maintain their current position
                    }}
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
                     onClick={handleSavePlan}
                     disabled={isSaving || !editedPlan.trim()}
                   >
                     {isSaving ? '💾 Saving...' : '💾 Save Plan'}
                   </button>
                 </div>
               </div>
             ) : isCommentsMode ? (
               // Comments Mode - Display plan with comment buttons
               <div className="comments-mode">
                 <div 
                   className="gemini-html-response"
                   dangerouslySetInnerHTML={{ __html: addCommentButtonsToPlan(formatContentForDisplay(cleanGeneratedPlan(updatedPlanWithComments || currentGeneratedPlan))) }}
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
               // View Mode - Display the generated plan
               <div 
                 dangerouslySetInnerHTML={{ __html: formatContentForDisplay(cleanGeneratedPlan(currentGeneratedPlan)) }}
                 className="gemini-html-response"
               />
             )}
           </div>
         </div>

        <div className="user-inputs-section">
          <h2>Your Inputs Summary</h2>
          <div className="inputs-grid">
            <div className="input-group">
              <h3>I. Sprint Overview</h3>
              <p><strong>Sprint Number:</strong> {userInputs?.sprint_overview?.SprintNumber || 'N/A'}</p>
              <p><strong>Sprint Dates:</strong> {userInputs?.sprint_overview?.SprintDates || 'N/A'}</p>
              <p><strong>Team Name:</strong> {userInputs?.sprint_overview?.TeamName || 'N/A'}</p>
              <p><strong>Sprint Goal:</strong> {userInputs?.sprint_overview?.SprintGoal || 'N/A'}</p>
            </div>

            <div className="input-group">
              <h3>II. Team Capacity</h3>
              <p><strong>Total Hours per Person:</strong> {userInputs?.team_capacity?.TotalHoursPerPerson || 'N/A'}</p>
              <p><strong>Number of Members:</strong> {userInputs?.team_capacity?.NumberOfMembers || 'N/A'}</p>
              <p><strong>Historical Story Points:</strong> {userInputs?.team_capacity?.HistoricalStoryPoints || 'N/A'}</p>
            </div>

            <div className="input-group">
              <h3>III. Product Backlog Items</h3>
              <p><strong>Number of Items:</strong> {userInputs?.product_backlog?.BacklogItems?.length || 0}</p>
            </div>

            <div className="input-group">
              <h3>IV. Definition of Done</h3>
              <p>{userInputs?.definition_of_done?.DoDContent || 'N/A'}</p>
            </div>

            <div className="input-group">
              <h3>V. Risks & Impediments</h3>
              <p>{userInputs?.risks_and_impediments?.RisksContent || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

             <div className="action-buttons">
         <button className="btn btn-warning" onClick={() => setShowValidateModal(true)}>
           Validate Plan
         </button>
         <button className="btn btn-secondary" onClick={handleBackToPlanning}>
           Generate Another Plan
         </button>

         <button className="btn btn-success" onClick={handleDownloadPlan}>
           📄 Download PDF
         </button>
         <button className="btn btn-primary" onClick={handleViewExistingPlans}>
           View All Plans
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

      {showSowModal && (
        <div className="loading-overlay" onClick={() => setShowSowModal(false)}>
          <div className="sow-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '95%', background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e5e7eb' }}>
            {/* Header with close button */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '20px',
              paddingBottom: '15px',
              borderBottom: '2px solid #e5e7eb'
            }}>
              <h2 style={{ margin: 0, color: '#1f2937', fontSize: '24px', fontWeight: '600' }}>
                Check Regulations for Sprint Execution
              </h2>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowSowModal(false)}
                style={{ padding: '8px 16px', fontSize: '14px' }}
              >
                ✕ Close
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 8px 0' }}>Existing</h3>
                {existingSowText ? (
                  <div>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowSowExisting(!showSowExisting)} style={{ marginBottom: '8px' }}>
                      {existingSowName}
                    </button>
                    {showSowExisting && (
                      <div style={{ maxHeight: '300px', overflowY: 'auto', padding: '8px', border: '1px solid #eee', borderRadius: '8px', color: '#1f2937' }}>
                        <div dangerouslySetInnerHTML={{ __html: sowData?.isHtml ? existingSowText : formatSowContentForDisplay(existingSowText) }} />
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{ color: '#6b7280' }}>No SOW attached for this session.</p>
                )}
              </div>
              <div style={{ width: '1px', background: '#e5e7eb' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleSowUpload}
                    style={{ 
                      padding: '12px 24px', 
                      fontSize: '16px',
                      fontWeight: '500',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      background: '#3182ce',
                      color: 'white',
                      transition: 'background-color 0.2s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    📄 Upload New SOW
                  </button>
                  
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx,.pdf,.doc"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  
                  <p style={{ color: '#6b7280', margin: 0, fontSize: '13px', textAlign: 'center', maxWidth: '200px' }}>
                    Upload a new Statement of Work (DOCX or PDF) to replace the current one.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Bottom section with Regenerate Plan button */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              marginTop: '20px',
              paddingTop: '15px',
              borderTop: '2px solid #e5e7eb'
            }}>
              <button 
                className="btn btn-primary" 
                onClick={handleRegeneratePlan}
                style={{ 
                  padding: '12px 24px', 
                  fontSize: '16px',
                  fontWeight: '500',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  background: '#10b981',
                  color: 'white',
                  transition: 'background-color 0.2s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                🔄 Regenerate Plan
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
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '20px',
              paddingBottom: '15px',
              borderBottom: '2px solid #e5e7eb'
            }}>
              <h2 style={{ margin: 0, color: '#1f2937', fontSize: '24px', fontWeight: '600' }}>
                Validate Sprint Plan
              </h2>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={handleValidatePlan}
                  style={{ 
                    padding: '8px 16px', 
                    fontSize: '14px',
                    fontWeight: '500',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    background: '#10b981',
                    color: 'white',
                    transition: 'background-color 0.2s'
                  }}
                >
                  Validate Plan
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
            
            <div style={{ 
              display: 'flex', 
              gap: '20px', 
              flex: 1,
              minHeight: '500px',
              overflow: 'hidden'
            }}>
              {/* Left Section */}
              <div style={{ 
                flex: 1, 
                background: '#f8fafc', 
                borderRadius: '8px', 
                padding: '20px',
                border: '1px solid #e2e8f0',
                overflow: 'auto'
              }}>
                <h3 style={{ 
                  margin: '0 0 15px 0', 
                  color: '#2d3748', 
                  fontSize: '18px', 
                  fontWeight: '600',
                  paddingBottom: '10px',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  Generated Sprint Plan
                </h3>
                <div 
                  className="gemini-html-response"
                  style={{ 
                    color: '#4a5568', 
                    fontSize: '14px', 
                    lineHeight: '1.6',
                    background: 'white',
                    borderRadius: '8px',
                    padding: '15px',
                    border: '1px solid #e2e8f0'
                  }}
                  dangerouslySetInnerHTML={{ __html: formatContentForDisplay(cleanGeneratedPlan(currentGeneratedPlan)) }}
                />
              </div>
              
              {/* Right Section */}
              <div style={{ 
                flex: 1, 
                background: '#f8fafc', 
                borderRadius: '8px', 
                padding: '20px',
                border: '1px solid #e2e8f0',
                overflow: 'auto'
              }}>
                <h3 style={{ 
                  margin: '0 0 15px 0', 
                  color: '#2d3748', 
                  fontSize: '18px', 
                  fontWeight: '600',
                  paddingBottom: '10px',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  SOW Document
                </h3>
                
                {/* Show structured SOW content like in SOW modal */}
                {existingSowText ? (
                  <div>
                    <div style={{ 
                      marginBottom: '15px',
                      padding: '8px 12px',
                      background: '#e6fffa',
                      border: '1px solid #38b2ac',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}>
                      <p style={{ margin: '0', fontWeight: '600', color: '#2d3748' }}>
                        📄 {existingSowName}
                      </p>
                    </div>
                    
                    <div style={{ 
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '15px',
                      maxHeight: '400px',
                      overflowY: 'auto',
                      fontSize: '14px',
                      lineHeight: '1.6',
                      color: '#1f2937'
                    }}>
                      <div dangerouslySetInnerHTML={{ __html: sowData?.isHtml ? existingSowText : formatSowContentForDisplay(existingSowText) }} />
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    padding: '20px',
                    textAlign: 'center',
                    background: '#f7fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    color: '#6b7280'
                  }}>
                    <p style={{ margin: '0', fontSize: '14px' }}>
                      No SOW document available for validation.
                    </p>
                    <p style={{ margin: '10px 0 0 0', fontSize: '13px' }}>
                      Upload a SOW document in the main sprint planning page to see it here.
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Bottom section with Regenerate Plan button */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              marginTop: '20px',
              paddingTop: '15px',
              borderTop: '2px solid #e5e7eb'
            }}>
              <button 
                className="btn btn-primary" 
                onClick={handleRegeneratePlan}
                style={{ 
                  padding: '12px 24px', 
                  fontSize: '16px',
                  fontWeight: '500',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  background: '#10b981',
                  color: 'white',
                  transition: 'background-color 0.2s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                🔄 Regenerate Plan
              </button>
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
            textAlign: 'center',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
          }}>
            <div style={{ 
              fontSize: '48px', 
              marginBottom: '20px',
              color: validationResult.includes('Error') ? '#ef4444' : '#10b981'
            }}>
              {validationResult.includes('Error') ? '❌' : '✅'}
            </div>
            
            <h2 style={{ 
              margin: '0 0 15px 0', 
              color: '#1f2937', 
              fontSize: '24px', 
              fontWeight: '600' 
            }}>
              {validationResult.includes('Error') ? 'Validation Failed' : 'Validation Complete!'}
            </h2>
            
            <p style={{ 
              margin: '0 0 25px 0', 
              color: '#4b5563', 
              fontSize: '16px', 
              lineHeight: '1.5' 
            }}>
              {validationResult}
            </p>
            
            <button 
              className="btn btn-primary" 
              onClick={() => setShowValidationResult(false)}
              style={{ 
                padding: '12px 24px', 
                fontSize: '16px',
                fontWeight: '500',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: validationResult.includes('Error') ? '#ef4444' : '#10b981',
                color: 'white',
                transition: 'background-color 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionModal && (
        <div className="loading-overlay" onClick={() => setShowVersionModal(false)}>
          <div className="version-modal" onClick={(e) => e.stopPropagation()} style={{ 
            maxWidth: '1200px', 
            width: '95%', 
            background: '#fff', 
            borderRadius: '12px', 
            padding: '20px', 
            border: '1px solid #e5e7eb',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
          }}>
            {/* Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '20px',
              paddingBottom: '15px',
              borderBottom: '2px solid #e5e7eb'
            }}>
              <h2 style={{ margin: 0, color: '#1f2937', fontSize: '24px', fontWeight: '600' }}>
                📚 Version History
              </h2>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowVersionModal(false)}
                style={{ padding: '8px 16px', fontSize: '14px' }}
              >
                ✕ Close
              </button>
            </div>
            
            {/* Version List */}
            <div style={{ 
              flex: 1,
              overflow: 'auto',
              padding: '10px 0'
            }}>
              {planVersions.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px', 
                  color: '#6b7280' 
                }}>
                  <p>No versions available yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {planVersions.map((version, index) => (
                    <div 
                      key={version.versionNumber}
                      style={{
                        border: version.versionNumber === currentVersionNumber ? '2px solid #3182ce' : '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '15px',
                        background: version.versionNumber === currentVersionNumber ? '#f0f9ff' : '#fff',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => {
                        // Create a copy of the version content to avoid reference issues
                        const restoredContent = typeof version.content === 'string' ? version.content.slice() : JSON.parse(JSON.stringify(version.content));
                        setCurrentGeneratedPlan(restoredContent);
                        setCurrentVersionNumber(version.versionNumber);
                        setShowVersionModal(false);
                        
                        console.log(`📚 [VERSION] Restored version ${version.versionNumber}`);
                        console.log(`📚 [VERSION] Restored content length: ${restoredContent?.length || 0}`);
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ 
                            fontWeight: '600', 
                            fontSize: '16px',
                            color: version.versionNumber === currentVersionNumber ? '#3182ce' : '#1f2937'
                          }}>
                            Version {version.versionNumber}
                            {version.versionNumber === currentVersionNumber && ' (Current)'}
                          </span>
                          <span style={{ 
                            fontSize: '12px', 
                            color: '#6b7280',
                            background: '#f3f4f6',
                            padding: '2px 8px',
                            borderRadius: '4px'
                          }}>
                            {version.action}
                          </span>
                        </div>
                        <span style={{ 
                          fontSize: '12px', 
                          color: '#6b7280' 
                        }}>
                          {version.timestamp}
                        </span>
                      </div>
                      
                      <p style={{ 
                        margin: '0', 
                        fontSize: '14px', 
                        color: '#4b5563',
                        lineHeight: '1.4'
                      }}>
                        {version.description}
                      </p>
                      
                      {/* Preview of content */}
                      <div style={{ 
                        marginTop: '10px',
                        padding: '8px',
                        background: '#f9fafb',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: '#6b7280',
                        maxHeight: '60px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {version.content.substring(0, 200)}...
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div style={{ 
              marginTop: '20px',
              paddingTop: '15px',
              borderTop: '1px solid #e5e7eb',
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '14px'
            }}>
              <p style={{ margin: '0' }}>
                Click on any version to restore it as the current plan
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="share-modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="share-modal-header">
              <h3>Share Sprint Plan via Email</h3>
              <button className="close-btn" onClick={() => setShowShareModal(false)}>×</button>
            </div>
            
            <div className="share-modal-content">
              <div className="form-group">
                <p style={{marginBottom: '15px', color: '#6b7280', fontSize: '0.9rem'}}>
                  📧 This will send an email with your description as the message body and the sprint plan as a PDF attachment.
                </p>
              </div>
              <div className="form-group">
                <label htmlFor="shareEmail">Recipient Email *</label>
                <input
                  type="email"
                  id="shareEmail"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="Enter recipient email address"
                  required
                  disabled={sendingEmail}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="shareDescription">Description</label>
                <textarea
                  id="shareDescription"
                  value={shareDescription}
                  onChange={(e) => setShareDescription(e.target.value)}
                  placeholder="Enter description for the email body"
                  rows={4}
                  disabled={sendingEmail}
                />
              </div>
            </div>
            
            <div className="share-modal-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowShareModal(false)}
                disabled={sendingEmail}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSendEmail}
                disabled={!shareEmail || sendingEmail}
              >
                {sendingEmail ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Animation while sending */}
      {sendingEmail && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            padding: '40px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <div className="loading-ring-large"></div>
            <h3 style={{ marginTop: '20px', color: '#1f2937', fontSize: '18px', fontWeight: '600' }}>
              Sending Email...
            </h3>
          </div>
        </div>
      )}

      {/* Sent Message Success Overlay */}
      {showSentMessage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            padding: '40px 60px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            animation: 'fadeIn 0.3s ease-in'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
            <h2 style={{ margin: 0, color: '#10b981', fontSize: '24px', fontWeight: '700' }}>
              Sent!
            </h2>
            <p style={{ margin: '10px 0 0 0', color: '#6b7280', fontSize: '16px' }}>
              Sprint plan sent successfully
            </p>
          </div>
        </div>
      )}

    </div>
  );
};

export default SprintResultsPage;
