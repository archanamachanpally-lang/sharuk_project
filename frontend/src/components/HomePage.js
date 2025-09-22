import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';
import axios from 'axios';
import './HomePage.css';

const HomePage = () => {
  const [selectedFeature, setSelectedFeature] = useState('');
  const [showSprintOptions, setShowSprintOptions] = useState(false);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSowPrompt, setShowSowPrompt] = useState(false);
  const [nextRoute, setNextRoute] = useState('');
  const [sowUploading, setSowUploading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showMonitorModal, setShowMonitorModal] = useState(false);
  const [feedbackData, setFeedbackData] = useState([]);
  const [monitorLoading, setMonitorLoading] = useState(false);
  const [tableScrollPosition, setTableScrollPosition] = useState(0);
  const [showAccessDeniedModal, setShowAccessDeniedModal] = useState(false);
  
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();


  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleFeatureChange = (event) => {
    const value = event.target.value;
    setSelectedFeature(value);
    
    // Reset sprint options when feature changes
    if (value !== 'sprint' && value !== 'risk-assessment') {
      setShowSprintOptions(false);
    }
  };

  const handleStartPlanning = async () => {
    // Show sprint options instead of navigating
    setShowSprintOptions(true);
  };

  const handleStartRiskAssessment = async () => {
    // Show risk assessment options instead of navigating
    setShowSprintOptions(true);
  };

  const handleSprintOption = async (option) => {
    try {
      console.log(`[TERMINAL LOG] Starting sprint planning session with option: ${option}`);
      
      // Fetch prompt data from documents table
      const response = await fetch('/api/sprint/prompt', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = response.json();
      
      if (data.success) {
        // Store prompt data in a variable
        const promptData = data.prompt;
        const featureData = data.feature;
        
        // Log the prompt data in terminal
        console.log("[TERMINAL LOG] Successfully fetched prompt data from documents table:");
        console.log("[TERMINAL LOG] Feature:", featureData);
        console.log("[TERMINAL LOG] Prompt:", promptData);
        
        // Store in sessionStorage for use in sprint planning
        sessionStorage.setItem('sprintPromptData', promptData);
        sessionStorage.setItem('sprintFeature', featureData);
        
        console.log("[TERMINAL LOG] Prompt data stored in sessionStorage for LLM usage");
      } else {
        console.log("[TERMINAL LOG] Failed to fetch prompt data:", data.message);
      }
      
      // Navigate to sprint planning page
      navigate('/sprint-planning');
    } catch (error) {
      console.error("[TERMINAL LOG] Error fetching prompt data:", error);
      // Still navigate even if prompt fetch fails
      navigate('/sprint-planning');
    }
  };

  const handleFeatureSelect = async (featureName) => {
    try {
      console.log(`[TERMINAL LOG] Starting ${featureName} session...`);
      
      // Fetch prompt data from documents table for the selected feature
      const response = await fetch(`/api/feature/prompt/${featureName}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        // Store prompt data in a variable
        const promptData = data.prompt;
        const featureData = data.feature;
        
        // Log the prompt data in terminal
        console.log(`[TERMINAL LOG] Successfully fetched prompt data from documents table for ${featureName}:`);
        console.log("[TERMINAL LOG] Feature:", featureData);
        console.log("[TERMINAL LOG] Prompt:", promptData);
        
        // Store in sessionStorage for use in the feature
        sessionStorage.setItem('featurePromptData', promptData);
        sessionStorage.setItem('featureName', featureData);
        
        console.log("[TERMINAL LOG] Prompt data stored in sessionStorage for LLM usage");
      } else {
        console.log(`[TERMINAL LOG] Failed to fetch prompt data for ${featureName}:`, data.message);
      }
      
      // Navigate to the feature page
      navigate(`/${featureName.toLowerCase().replace(/\s+/g, '-')}`);
    } catch (error) {
      console.error(`[TERMINAL LOG] Error fetching prompt data for ${featureName}:`, error);
      // Still navigate even if prompt fetch fails
      navigate(`/${featureName.toLowerCase().replace(/\s+/g, '-')}`);
    }
  };

  const handleViewExistingPlans = () => {
    navigate('/existing-plans');
  };

  const handleViewExistingRiskAssessments = () => {
    navigate('/existing-risk-assessments');
  };

  const handleFeedbackClick = () => {
    navigate('/feedback');
  };

  const handleMonitorClick = async () => {
    console.log('📊 [MONITOR] Monitor button clicked');
    
    // Check if user is admin
    const adminEmails = [
      'shaik.sharuk@forsysinc.com',
      // Add more admin emails here
    ];
    const currentUserEmail = user?.email;
    
    if (!adminEmails.includes(currentUserEmail)) {
      setShowAccessDeniedModal(true);
      return;
    }
    
    console.log('📊 [MONITOR] Admin access confirmed for:', currentUserEmail);
    setShowMonitorModal(true);
    setMonitorLoading(true);
    
    try {
      console.log('📊 [MONITOR] Making API request to /api/feedback');
      
      // Fetch feedback data from API
      const response = await fetch('/api/feedback', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📊 [MONITOR] Response status:', response.status);
      console.log('📊 [MONITOR] Response ok:', response.ok);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('📊 [MONITOR] Raw API response:', result);
      
      if (result.success) {
        console.log('✅ [MONITOR] Successfully fetched feedback data:', result.feedback);
        console.log('✅ [MONITOR] Feedback count:', result.feedback?.length || 0);
        setFeedbackData(result.feedback || []);
      } else {
        console.error('❌ [MONITOR] API returned error:', result.message);
        setFeedbackData([]);
      }
    } catch (error) {
      console.error('❌ [MONITOR] Network error:', error);
      console.error('❌ [MONITOR] Error details:', error.message);
      setFeedbackData([]);
    } finally {
      setMonitorLoading(false);
    }
  };

  const handleCloseMonitor = () => {
    setShowMonitorModal(false);
    setFeedbackData([]);
    setTableScrollPosition(0); // Reset scroll position when closing
  };

  const handleTableScrollRight = () => {
    console.log('🔄 [SCROLL] Right button clicked');
    // Add a small delay to ensure container is rendered
    setTimeout(() => {
      const container = document.querySelector('.feedback-table-container');
      console.log('🔄 [SCROLL] Container found:', container);
      if (container) {
        const currentScroll = container.scrollLeft;
        const scrollAmount = 800; // Scroll by approximately 6-7 columns
        const newScroll = currentScroll + scrollAmount;
        console.log('🔄 [SCROLL] Current scroll:', currentScroll, 'New scroll:', newScroll);
        container.scrollLeft = newScroll;
        setTableScrollPosition(newScroll);
      } else {
        console.log('🔄 [SCROLL] Container not found!');
      }
    }, 100);
  };

  const handleTableScrollLeft = () => {
    console.log('🔄 [SCROLL] Left button clicked');
    // Add a small delay to ensure container is rendered
    setTimeout(() => {
      const container = document.querySelector('.feedback-table-container');
      console.log('🔄 [SCROLL] Container found:', container);
      if (container) {
        const currentScroll = container.scrollLeft;
        const scrollAmount = 800; // Scroll back by approximately 6-7 columns
        const newScroll = Math.max(0, currentScroll - scrollAmount);
        console.log('🔄 [SCROLL] Current scroll:', currentScroll, 'New scroll:', newScroll);
        container.scrollLeft = newScroll;
        setTableScrollPosition(newScroll);
      } else {
        console.log('🔄 [SCROLL] Container not found!');
      }
    }, 100);
  };

  // Effect to track scroll position and update button visibility
  useEffect(() => {
    const container = document.querySelector('.feedback-table-container');
    if (container && showMonitorModal) {
      const handleScroll = () => {
        setTableScrollPosition(container.scrollLeft);
      };
      
      container.addEventListener('scroll', handleScroll);
      
      // Initialize scrollbar to prevent first-click sticking issue
      setTimeout(() => {
        // Force scrollbar to be visible and active
        container.style.overflowX = 'scroll';
        container.style.overflowY = 'auto';
        
        // Reset scroll position
        container.scrollLeft = 0;
        
        // Force browser to recognize the scrollbar
        const scrollWidth = container.scrollWidth;
        const clientWidth = container.clientWidth;
        
        if (scrollWidth > clientWidth) {
          // Temporarily scroll to activate scrollbar
          container.scrollLeft = 1;
          setTimeout(() => {
            container.scrollLeft = 0;
          }, 10);
        }
      }, 200);
      
      return () => {
        container.removeEventListener('scroll', handleScroll);
      };
    }
  }, [showMonitorModal]);


  const handleLogout = async () => {
    await logout();
    navigate('/');
    setShowProfilePopup(false);
  };

  const handleAddAccount = async () => {
    // Close the popup first
    setShowProfilePopup(false);
    
    try {
      // Get Google OAuth URL from backend with account selection prompt
      const response = await axios.get('/api/auth/google/url?prompt=select_account');
      const { auth_url, error } = response.data;
      
      if (error || !auth_url) {
        console.error('Google OAuth configuration error:', error);
        alert('Unable to add account. Please try again later.');
        return;
      }
      
      // Open in a new popup window for account selection
      const popup = window.open(
        auth_url,
        'google-add-account',
        'width=500,height=600,scrollbars=yes,resizable=yes,top=100,left=100'
      );
      
      // Listen for the popup to close and check for successful authentication
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          // Check if a new user was added by checking localStorage
          const currentUser = localStorage.getItem('user');
          if (currentUser) {
            // Refresh the page to show updated user info
            window.location.reload();
          }
        }
      }, 1000);
      
    } catch (error) {
      console.error('Add account error:', error);
      alert('Failed to add account. Please try again.');
    }
  };

  const handleBackToFeatureSelection = () => {
    setShowSprintOptions(false);
    setSelectedFeature('');
  };

  const handleExcelUpload = (event) => {
    console.log('handleExcelUpload called');
    const file = event.target.files[0];
    if (!file) {
      console.log('No file found, returning');
      return;
    }
    console.log('File found:', file.name);

    // Simulate upload progress with more realistic timing
    console.log('Starting Excel progress simulation');
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        const newProgress = prev + Math.random() * 10 + 3;
        console.log('Excel Progress update:', prev, '->', newProgress);
        if (newProgress >= 85) {
          clearInterval(progressInterval);
          console.log('Excel Progress stopped at 85%');
          return 85; // Stop at 85% until actual processing completes
        }
        return newProgress; // Random increment between 3-13%
      });
    }, 150);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        if (selectedFeature === 'risk-assessment') {
          // Process risk assessment Excel/CSV format
          console.log('Processing risk assessment Excel/CSV file');
          console.log('Available sheets:', workbook.SheetNames);
          
          // Get the first sheet (most CSV/Excel files have data in the first sheet)
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to JSON with headers (this will use the first row as column names)
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          console.log('Raw Excel data:', jsonData);
          
          if (jsonData.length > 1) {
            // Get headers from first row
            const headers = jsonData[0];
            console.log('Headers found:', headers);
            
            // Process all data rows (skip header row)
            const allRiskData = [];
            
            for (let i = 1; i < jsonData.length; i++) {
              const dataRow = jsonData[i];
              console.log(`Processing data row ${i}:`, dataRow);
              
              // Skip empty rows
              if (!dataRow || dataRow.every(cell => cell === undefined || cell === null || cell === '')) {
                continue;
              }
              
              // Create risk data object with CSV column mapping
              const riskData = {};
              
              // Map CSV columns to form fields
              headers.forEach((header, index) => {
                if (dataRow[index] !== undefined && dataRow[index] !== null && dataRow[index] !== '') {
                  riskData[header] = dataRow[index];
                }
              });
              
              // Only add if we have at least an Issue key
              if (riskData['Issue key']) {
                allRiskData.push(riskData);
                console.log(`Added risk data for ${riskData['Issue key']}:`, riskData);
              }
            }
            
            console.log('All mapped risk data:', allRiskData);
            console.log(`Total risks found: ${allRiskData.length}`);
            
            // Store the structured data in sessionStorage
            sessionStorage.setItem('excelRiskData', JSON.stringify(allRiskData));
            console.log('Risk Excel/CSV data processed and stored:', allRiskData);
            
            // Don't navigate automatically - let SOW popup handle navigation
          } else {
            console.log('No data found in Excel file');
          }
          
        } else {
          // Process sprint planning Excel format (existing logic)
          const sprintData = {};
          
          console.log('Processing sprint planning Excel file');
          console.log('Available sheets:', workbook.SheetNames);
          
          // Map sheet names to form sections
          const sheetMapping = {
            'Sprint Overview': 'sprintOverview',
            'Team Capacity': 'teamCapacity', 
            'Product Backlog': 'productBacklog',
            'Definition of Done': 'definitionOfDone',
            'Risks & Impediments': 'risksImpediments',
            'Additional Comments': 'additionalComments'
          };

          // Process each sheet
          workbook.SheetNames.forEach(sheetName => {
            console.log(`Processing sheet: ${sheetName}`);
            if (sheetMapping[sheetName]) {
              const worksheet = workbook.Sheets[sheetName];
              const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
              
              console.log(`Raw data for ${sheetName}:`, jsonData);
              
              // Map the data based on sheet type
              const mappedData = mapSheetData(sheetName, jsonData);
              sprintData[sheetMapping[sheetName]] = mappedData;
              
              console.log(`Processed sheet: ${sheetName}`, mappedData);
            } else {
              console.log(`Sheet ${sheetName} not in mapping, skipping`);
            }
          });

          // Store the structured data in sessionStorage
          sessionStorage.setItem('excelSprintData', JSON.stringify(sprintData));
          console.log('All Excel data processed and stored:', sprintData);
          console.log('Excel data structure:', JSON.stringify(sprintData, null, 2));
        }
        
        // Clear the progress interval
        clearInterval(progressInterval);
        
        // Gradually complete the progress to 100%
        const finalProgressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 100) {
              clearInterval(finalProgressInterval);
              return 100;
            }
            return prev + 2;
          });
        }, 50);
        
        // Instead of navigating immediately, set route and prompt for optional SOW
        setNextRoute(selectedFeature === 'risk-assessment' ? '/risk-assessment' : '/sprint-planning');
        setShowSowPrompt(true);
        
      } catch (error) {
        console.error('Error reading Excel file:', error);
        alert('Error reading Excel file. Please make sure it\'s a valid Excel file.');
      } finally {
        // Reset states after a delay to show completion
        setTimeout(() => {
          setLoading(false);
          setUploadProgress(0);
        }, 1000);
      }
    };
    
    reader.readAsArrayBuffer(file);
    
    // Reset the file input
    event.target.value = '';
  };

  const handleDocxUpload = async (event) => {
    console.log('handleDocxUpload called');
    const file = event.target.files[0];
    if (!file) {
      console.log('No file found, returning');
      return;
    }
    console.log('File found:', file.name);

    try {
      // Create FormData to send the file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('feature_type', selectedFeature === 'risk-assessment' ? 'risk-assessment' : 'sprint');

      // Simulate upload progress with more realistic timing
      console.log('Starting progress simulation');
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + Math.random() * 10 + 3;
          console.log('Progress update:', prev, '->', newProgress);
          if (newProgress >= 85) {
            clearInterval(progressInterval);
            console.log('Progress stopped at 85%');
            return 85; // Stop at 85% until actual upload completes
          }
          return newProgress; // Random increment between 3-13%
        });
      }, 150);

      // Send file to backend
      const response = await fetch('/api/upload/docx', {
        method: 'POST',
        body: formData,
      });

      // Clear the progress interval
      clearInterval(progressInterval);
      
      // Gradually complete the progress to 100%
      const finalProgressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(finalProgressInterval);
            return 100;
          }
          return prev + 2;
        });
      }, 50);

      const result = await response.json();

      if (result.success) {
        console.log('DOCX file parsed successfully:', result.data);
        // Store parsed data
        if (selectedFeature === 'sprint') {
          sessionStorage.setItem('docxSprintData', JSON.stringify(result.data));
          setNextRoute('/sprint-planning');
        } else if (selectedFeature === 'risk-assessment') {
          sessionStorage.setItem('docxRiskData', JSON.stringify(result.data));
          setNextRoute('/risk-assessment');
        }
        // Prompt for optional SOW
        setShowSowPrompt(true);
      } else {
        console.error('DOCX upload failed:', result.error);
        alert(`Error uploading DOCX file: ${result.error}`);
      }
    } catch (error) {
      console.error('DOCX upload error:', error);
      alert('Error uploading DOCX file. Please try again.');
    } finally {
      // Reset states after a delay to show completion
      setTimeout(() => {
        setLoading(false);
        setUploadProgress(0);
      }, 1000);
      // Reset the file input
      event.target.value = '';
    }
  };

  const handleSowUpload = async (event) => {
    console.log('handleSowUpload called');
    const file = event.target.files[0];
    if (!file) {
      console.log('No SOW file found, returning');
      return;
    }
    console.log('SOW File found:', file.name);

    try {
      // Create FormData to send the file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('feature_type', 'sow');

      // Send file to backend
      const response = await fetch('/api/upload/sow', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        console.log('SOW file parsed successfully:', result.data);
        sessionStorage.setItem('sowContentRaw', result?.data?.rawText || '');
        sessionStorage.setItem('sowFileName', file.name);
        // Store HTML content if available
        if (result?.data?.htmlContent) {
          sessionStorage.setItem('sowContentHtml', result.data.htmlContent);
        }
        setToastMessage('SOW file uploaded successfully');
        setToastVisible(true);
        setTimeout(() => setToastVisible(false), 2000);
        // Navigate to next route and hide SOW prompt after successful upload
        setShowSowPrompt(false);
        navigate(nextRoute || '/sprint-planning');
      } else {
        console.error('SOW upload failed:', result.error);
        alert(`Error uploading SOW file: ${result.error}`);
      }
    } catch (error) {
      console.error('SOW upload error:', error);
      alert('Error uploading SOW file. Please try again.');
    } finally {
      // Clear loading indicator immediately for this simple save flow
      setLoading(false);
      setUploadProgress(0);
      // Reset the file input
      event.target.value = '';
    }
  };

  // Helper function to map sheet data to form fields
  const mapSheetData = (sheetName, jsonData) => {
    console.log(`Mapping sheet: ${sheetName}`, jsonData);
    if (!jsonData || jsonData.length < 2) {
      console.log(`Sheet ${sheetName} has insufficient data`);
      return {};
    }

    const headers = jsonData[0];
    const dataRow = jsonData[1]; // Assuming first data row contains the values
    console.log(`Headers for ${sheetName}:`, headers);
    console.log(`Data row for ${sheetName}:`, dataRow);

    switch (sheetName) {
      case 'Sprint Overview':
        return {
          sprintNumber: dataRow[0] || 'N/A',
          sprintDates: dataRow[1] || 'N/A',
          sprintDuration: dataRow[2] || 'N/A',
          teamName: dataRow[3] || 'N/A',
          sprintGoal: dataRow[4] || 'N/A'
        };

      case 'Team Capacity':
        const teamMembers = [];
        // Start from row 4 (index 3) where team member data begins
        for (let i = 3; i < jsonData.length; i++) {
          if (jsonData[i][0] && jsonData[i][0] !== 'Role') {
            teamMembers.push({
              role: jsonData[i][0] || 'N/A',
              workingHours: jsonData[i][1] || 'N/A'
            });
          }
        }
        // If no team members found, add a default one
        if (teamMembers.length === 0) {
          teamMembers.push({
            role: 'N/A',
            workingHours: 'N/A'
          });
        }
        return {
          totalHoursPerPerson: dataRow[0] || 'N/A',
          historicalStoryPoints: dataRow[1] || 'N/A',
          teamMembers: teamMembers
        };

      case 'Product Backlog':
        const userStories = [];
        // Start from row 2 (index 1) where user stories begin
        for (let i = 1; i < jsonData.length; i++) {
          if (jsonData[i][0] && jsonData[i][0] !== 'UserStorySummary') {
            userStories.push({
              userStorySummary: jsonData[i][0] || 'N/A',
              acceptanceCriteria: jsonData[i][1] || 'N/A',
              priority: jsonData[i][2] || 'Low',
              effortEstimate: parseInt(jsonData[i][3]) || 0
            });
          }
        }
        // If no user stories found, add a default one
        if (userStories.length === 0) {
          userStories.push({
            userStorySummary: 'N/A',
            acceptanceCriteria: 'N/A',
            priority: 'Low',
            effortEstimate: 0
          });
        }
        return { userStories };

      case 'Definition of Done':
        const criteria = dataRow[0] || '';
        const criteriaArray = criteria.split(';').map(c => c.trim()).filter(c => c);
        return {
          definitionOfDone: criteriaArray.length > 0 ? criteriaArray : ['N/A']
        };

      case 'Risks & Impediments':
        const risks = dataRow[0] || '';
        const risksArray = risks.split(',').map(r => r.trim()).filter(r => r);
        return {
          risksImpediments: risksArray.length > 0 ? risksArray : ['N/A']
        };

      case 'Additional Comments':
        return {
          additionalComments: dataRow[0] || 'N/A'
        };

      default:
        return {};
    }
  };

  // Helper function to map risk assessment sheet data to form fields
  const mapRiskSheetData = (sheetName, jsonData) => {
    if (!jsonData || jsonData.length < 2) return {};

    const headers = jsonData[0];
    const dataRow = jsonData[1]; // Assuming first data row contains the values

    switch (sheetName) {
      case 'Risk ID':
        return {
          riskIDValue: dataRow[0] || ''
        };

      case 'Risk Description':
        return {
          primarySource: dataRow[0] || '',
          secondarySource: dataRow[1] || ''
        };

      case 'Severity':
        return {
          source: dataRow[0] || '',
          alternativeSource: dataRow[1] || '',
          severityValue: dataRow[2] || 'Medium'
        };

      case 'Status':
        return {
          statusValue: dataRow[0] || 'Open'
        };

      case 'Risk Owner':
        return {
          primarySource: dataRow[0] || '',
          secondarySource: dataRow[1] || ''
        };

      case 'Date Identified':
        return {
          dateIdentifiedValue: dataRow[0] || ''
        };

      case 'Mitigation Plan':
        return {
          primarySource: dataRow[0] || '',
          secondarySource: dataRow[1] || ''
        };

      case 'Relevant NotesContext':
        return {
          relevantNotesValue: dataRow[0] || ''
        };

      default:
        return {};
    }
  };

  // Function to download sprint planning template
  const downloadSprintTemplate = () => {
    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // Define the sheets and their data
    const sheets = [
      {
        name: 'Sprint Overview',
        data: [
          ['Sprint Number', 'Sprint Dates', 'Sprint Duration', 'Team Name', 'Sprint Goal'],
          ['Sprint 1', 'March 1-15, 2024', '2 weeks', 'Alpha Team', 'Deliver user authentication feature']
        ]
      },
      {
        name: 'Team Capacity',
        data: [
          ['Total Hours Per Person', 'Historical Story Points'],
          ['40 hours', '25 points'],
          ['', ''],
          ['Role', 'Working Hours'],
          ['Developer', '40h'],
          ['Designer', '32h'],
          ['QA Engineer', '40h']
        ]
      },
      {
        name: 'Product Backlog',
        data: [
          ['UserStorySummary', 'AcceptanceCriteria', 'Priority', 'EffortEstimate'],
          ['As a user, I want to login', 'User can enter credentials and access system', 'High', '8'],
          ['As a user, I want to register', 'User can create new account', 'Medium', '5']
        ]
      },
      {
        name: 'Definition of Done',
        data: [
          ['Criteria'],
          ['Code reviewed; Tests written; Documentation updated; Deployed to staging']
        ]
      },
      {
        name: 'Risks & Impediments',
        data: [
          ['Risks'],
          ['Third-party integration delays, Team member availability, Technical debt']
        ]
      },
      {
        name: 'Additional Comments',
        data: [
          ['Comments'],
          ['Additional notes and considerations for this sprint']
        ]
      }
    ];
    
    // Add each sheet to the workbook
    sheets.forEach(sheet => {
      const worksheet = XLSX.utils.aoa_to_sheet(sheet.data);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
    });
    
    // Download the file
    XLSX.writeFile(workbook, 'sprint_planning_template.xlsx');
  };

  // Function to download risk assessment template
  const downloadRiskAssessmentTemplate = () => {
    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // Define the sheets and their data
    const sheets = [
      {
        name: 'Risk ID',
        data: [
          ['Source'],
          ['Issue key']
        ]
      },
      {
        name: 'Risk Description',
        data: [
          ['Primary Source', 'Secondary Source (for additional detail/clarity)'],
          ['Summary', 'Synthesize from \'Description\' and relevant \'Comments\'']
        ]
      },
      {
        name: 'Severity',
        data: [
          ['Source', 'Alternative Source (if \'Priority\' is ambiguous/empty)'],
          ['Priority\' (Map Jira priorities like \'Highest\', \'High\', \'Medium\', \'Low\', \'Lowest\' directly)', 'Infer from keywords in \'Summary\' or \'Description\' (e.g., "critical error", "major impact", "minor bug")']
        ]
      },
      {
        name: 'Status',
        data: [
          ['Source'],
          ['Status\' (e.g., \'In Progress\', \'Ready for QA\', \'Closed\', \'Done\')']
        ]
      },
      {
        name: 'Risk Owner',
        data: [
          ['Primary Source', 'Secondary Source (if primary is empty/N/A)'],
          ['Assignee', 'Reporter\' or \'Creator\'']
        ]
      },
      {
        name: 'Date Identified',
        data: [
          ['Source'],
          ['Created\' date']
        ]
      },
      {
        name: 'Mitigation Plan',
        data: [
          ['Primary Source', 'Secondary Source (if primary is empty/N/A)'],
          ['Custom field (Risk / Mitigation)', 'and \'Comments\'. Look for phrases like "plan to...", "solution is to...", "we will...", "workaround:", "action item:". If multiple steps, summarize concisely']
        ]
      },
      {
        name: 'Relevant NotesContext',
        data: [
          ['Source'],
          ['Concisely summarize critical information from \'Comments\' that provides additional context about the risk, its impact, or discussions around it']
        ]
      }
    ];

    // Add each sheet to the workbook
    sheets.forEach(sheet => {
      const worksheet = XLSX.utils.aoa_to_sheet(sheet.data);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
    });

    // Generate and download the file
    const fileName = 'Risk_Register_Template.xlsx';
    XLSX.writeFile(workbook, fileName);
  };

  // Profile popup component
  const ProfilePopup = () => (
    <div className="profile-popup-overlay" onClick={() => setShowProfilePopup(false)}>
      <div className="profile-popup simple-theme" onClick={(e) => e.stopPropagation()}>
        <div className="profile-popup-header">
          <div className="profile-info">
            <div className="profile-picture-container">
              <img 
                src={user?.picture || user?.photoURL || ''} 
                alt="Profile" 
                className="profile-picture"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              {!user?.picture && !user?.photoURL && (
                <div className="profile-picture-fallback">
                  {(user?.name || user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="profile-details">
              <h3>{user?.name || user?.displayName || user?.email?.split('@')[0] || 'User'}</h3>
              <p className="user-email">{user?.email}</p>
            </div>
          </div>
        </div>
        
        <div className="profile-popup-actions">
          <button className="add-account-btn" onClick={handleAddAccount}>
            Add Account
          </button>
          <button className="signout-btn" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );

  // Monitor modal component
  const MonitorModal = () => {
    console.log('📊 [MONITOR MODAL] Rendering with data:', feedbackData);
    console.log('📊 [MONITOR MODAL] Loading state:', monitorLoading);
    console.log('📊 [MONITOR MODAL] Data length:', feedbackData?.length || 0);
    
    return (
      <div className="monitor-modal-overlay" onClick={handleCloseMonitor}>
        <div className="monitor-modal" onClick={(e) => e.stopPropagation()}>
          <div className="monitor-modal-header">
            <h2>📊 Feedback Monitor</h2>
            <button className="close-btn" onClick={handleCloseMonitor}>×</button>
          </div>
          
          <div className="monitor-modal-content">
            {monitorLoading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading feedback data...</p>
              </div>
            ) : feedbackData.length === 0 ? (
              <div className="no-data">
                <p>No feedback data available</p>
                <p style={{fontSize: '0.9rem', color: '#9ca3af', marginTop: '10px'}}>
                  Debug: Data length = {feedbackData?.length || 0}
                </p>
              </div>
            ) : (
            <div 
              className="feedback-table-container"
              onClick={(e) => {
                // Ensure the container is focused for scrolling
                e.currentTarget.focus();
              }}
              tabIndex={0}
            >
              <div className="table-header">
                <h3>Feedback Submissions ({feedbackData.length})</h3>
              </div>
              <div className="feedback-table">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Clarity of Sprint Goals (Rating: 1–5)</th>
                      <th>Workload Distribution (Rating: 1–5)</th>
                      <th>Plan Alignment with SOW</th>
                      <th>Suggestions for Sprint Planning</th>
                      <th>Identified Risks Were Clear?</th>
                      <th>Risk Mitigation Steps Were Practical?</th>
                      <th>Suggestions for Risk Assessment</th>
                      <th>Overall Rating for Sprint Planning (Rating: 1–5)</th>
                      <th>Overall Rating for Risk Assessment (Rating: 1–5)</th>
                      <th>Additional Comments</th>
                      <th>Created At</th>
                      <th>Created By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedbackData.map((feedback, index) => (
                      <tr key={feedback.id || index}>
                        <td>{feedback.id || 'N/A'}</td>
                        <td>{feedback.name || 'N/A'}</td>
                        <td>{feedback.email || 'N/A'}</td>
                        <td>{feedback.clarity_of_sprint_goals || 'N/A'}</td>
                        <td>{feedback.workload_distribution || 'N/A'}</td>
                        <td>{feedback.plan_alignment_sow || 'N/A'}</td>
                        <td className="text-cell">{feedback.suggestions_sprint_planning || 'N/A'}</td>
                        <td>{feedback.risks_clear || 'N/A'}</td>
                        <td>{feedback.mitigation_practical || 'N/A'}</td>
                        <td className="text-cell">{feedback.suggestions_risk_assessment || 'N/A'}</td>
                        <td>{feedback.overall_sprint_planning_rating || 'N/A'}</td>
                        <td>{feedback.overall_risk_assessment_rating || 'N/A'}</td>
                        <td className="text-cell">{feedback.additional_comments || 'N/A'}</td>
                        <td>{new Date(feedback.created_at).toLocaleDateString()}</td>
                        <td>{feedback.created_by || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    );
  };

  // Access Denied Modal component
  const AccessDeniedModal = () => {
    return (
      <div className="access-denied-modal-overlay" onClick={() => setShowAccessDeniedModal(false)}>
        <div className="access-denied-modal" onClick={(e) => e.stopPropagation()}>
          <div className="access-denied-header">
            <div className="access-denied-icon">
              🚫
            </div>
            <h2>Access Denied</h2>
          </div>
          
          <div className="access-denied-content">
            <div className="access-denied-message">
              <h3>Admin Only</h3>
            </div>
          </div>
          
          <div className="access-denied-footer">
            <button 
              className="btn btn-primary" 
              onClick={() => setShowAccessDeniedModal(false)}
            >
              Understood
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!isAuthenticated) {
    return null;
  }

  // Show sprint options if selected
  if (showSprintOptions) {
    return (
      <div className="home-page">
        <div className="container">
          <div className="header">
            <div className="monitor-section">
              <button 
                className="monitor-btn"
                onClick={() => handleMonitorClick()}
                title="Monitor"
              >
                📊
              </button>
            </div>
            <div className="welcome-section">
              <h1>Welcome to PM Portal</h1>
            </div>
            <div className="profile-section">
              <div 
                className="profile-photo"
                onClick={() => setShowProfilePopup(true)}
              >
                <span className="profile-initial">
                  {(user?.name || user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="main-content">
            <div className="text-center">
              {showSprintOptions && (
                <div className="sprint-options-section">
                  <div className="sprint-options-content">
                    <h2>Choose Your Input Method</h2>
                    <p>Select how you would like to provide your {selectedFeature === 'risk-assessment' ? 'risk assessment' : 'sprint planning'} information:</p>
                    
                    <div className="options-container">
                      <div className="option-card">
                        <button
                          className="template-chip"
                          onClick={selectedFeature === 'risk-assessment' ? downloadRiskAssessmentTemplate : downloadSprintTemplate}
                          title="Download Excel Template"
                        >
                          Excel Template
                        </button>
                        <div className="option-icon">📁</div>
                        <h3>Upload File</h3>
                        <p>Import your {selectedFeature === 'risk-assessment' ? 'risk assessment' : 'sprint'} data from Excel (.xlsx, .xls) or Word (.docx) files</p>
                        <div className="file-actions">
                          <input
                            type="file"
                            id="file-upload"
                            accept=".xlsx,.xls,.docx"
                            onChange={(event) => {
                              const file = event.target.files[0];
                              if (!file) return;
                              
                              const fileExtension = file.name.split('.').pop().toLowerCase();
                              if (fileExtension === 'docx') {
                                console.log('DOCX file selected, showing loading animation...');
                                // Show loading immediately for DOCX files
                                setLoading(true);
                                setUploadProgress(0);
                                console.log('Loading state set to true, progress set to 0');
                                // Small delay to ensure loading state is visible
                                setTimeout(() => {
                                  console.log('Starting DOCX upload process...');
                                  handleDocxUpload(event);
                                }, 100);
                              } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
                                console.log('Excel file selected, showing loading animation...');
                                // Show loading immediately for Excel files
                                setLoading(true);
                                setUploadProgress(0);
                                console.log('Loading state set to true, progress set to 0');
                                // Small delay to ensure loading state is visible
                                setTimeout(() => {
                                  console.log('Starting Excel upload process...');
                                  handleExcelUpload(event);
                                }, 100);
                              }
                            }}
                            style={{ display: 'none' }}
                          />
                          <button 
                            className="btn btn-primary option-btn"
                            onClick={() => document.getElementById('file-upload').click()}
                          >
                            UPLOAD FILE
                          </button>
                        </div>
                      </div>
                      
                      <div className="option-card">
                        <div className="option-icon">✏️</div>
                        <h3>Enter Manually</h3>
                        <p>Fill out the {selectedFeature === 'risk-assessment' ? 'risk assessment' : 'sprint planning'} form step by step</p>
                        <button 
                          className="btn btn-success option-btn"
                          onClick={() => navigate(selectedFeature === 'risk-assessment' ? '/risk-assessment' : '/sprint-planning')}
                        >
                          START MANUAL ENTRY
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Loading Overlay */}
        {loading && (
          <div className="loading-overlay">
            <div className="loading-content">
              <div className="loading-ring-large"></div>
              <div className="loading-text">Processing Your Document</div>
              <div className="loading-subtext">This may take a few moments...</div>
              <div className="upload-progress-container">
                <div className="upload-progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }}></div>
                </div>
                <div className="upload-progress-text">{Math.round(uploadProgress)}%</div>
              </div>
              <div className="upload-status-text">Parsing document content...</div>
            </div>
          </div>
        )}
        {showSowPrompt && (
          <div className="loading-overlay" onClick={() => {}}>
            <div className="sow-prompt">
              <h3 className="sow-title">Select SOW document (optional)</h3>
              <p className="sow-sub">Attach a Statement of Work (DOCX or PDF) to enrich the plan, or skip.</p>
              <div className="sow-actions">
                <input
                  type="file"
                  id="sow-inline-upload"
                  accept=".docx,.pdf"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    const form = new FormData();
                    form.append('file', file);
                    if (user?.email) form.append('user_email', user.email);
                    try {
                      setSowUploading(true);
                      const resp = await fetch('/api/upload/sow', { method: 'POST', body: form });
                      const resj = await resp.json();
                      if (resj?.success) {
                        sessionStorage.setItem('sowContentRaw', resj?.data?.rawText || '');
                        sessionStorage.setItem('sowFileName', file.name);
                        // Store HTML content if available
                        if (resj?.data?.htmlContent) {
                          sessionStorage.setItem('sowContentHtml', resj.data.htmlContent);
                        }
                        setToastMessage('SOW attached');
                        setToastVisible(true);
                        setShowSowPrompt(false);
                        navigate(nextRoute || '/sprint-planning');
                      } else {
                        alert(resj?.error || 'Failed to read SOW');
                      }
                    } catch (err) {
                      alert('Failed to upload SOW');
                    } finally {
                      setSowUploading(false);
                    }
                  }}
                />
                <div className="sow-buttons">
                  <button className="btn btn-warning option-btn" onClick={() => document.getElementById('sow-inline-upload').click()} disabled={sowUploading}>
                    {sowUploading ? 'UPLOADING...' : 'CHOOSE SOW'}
                  </button>
                  <button className="btn btn-primary option-btn" onClick={() => { setShowSowPrompt(false); navigate(nextRoute || '/sprint-planning'); }}>
                    SKIP
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {toastVisible && (
          <div className="toast success-toast">{toastMessage}</div>
        )}
        
        {showProfilePopup && <ProfilePopup />}
        {showMonitorModal && <MonitorModal />}
        {showAccessDeniedModal && <AccessDeniedModal />}
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="container">
        <div className="header">
          <div className="monitor-section">
            <button 
              className="monitor-btn"
              onClick={() => handleMonitorClick()}
              title="Monitor"
            >
              📊
            </button>
          </div>
          <div className="welcome-section">
            <h1>Welcome to PM Portal</h1>
          </div>
          <div className="feedback-section">
            <button 
              className="feedback-btn"
              onClick={() => handleFeedbackClick()}
            >
              Feedback
            </button>
          </div>
          <div className="profile-section">
            <div 
              className="profile-photo"
              onClick={() => setShowProfilePopup(true)}
            >
              <span className="profile-initial">
                {(user?.name || user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="main-content">
          <div className="text-center">
            <h2 className="section-title">Select a Feature</h2>
            <p className="section-description">
              Choose from the available features to begin your planning session
            </p>

            <div className="feature-selector">
              <select
                className="select-control"
                value={selectedFeature}
                onChange={handleFeatureChange}
              >
                <option value="" disabled>Select a feature...</option>
                <option value="sprint">Sprint Planning</option>
                <option value="risk-assessment">Risk Assessment</option>
              </select>
            </div>

            {/* Always render the section to prevent layout shifts */}
            <div className={`start-section ${selectedFeature ? '' : 'hidden'}`}>
              {selectedFeature && (
                <>
                                     {selectedFeature === 'sprint' ? (
                     <div className="sprint-buttons-container">
                       <button
                         className="btn btn-primary view-plans-btn"
                         onClick={handleViewExistingPlans}
                       >
                         View Existing Plans
                       </button>
                       <button
                         className="btn btn-success start-planning-btn"
                         onClick={handleStartPlanning}
                       >
                         Start Planning
                       </button>
                     </div>
                   ) : selectedFeature === 'risk-assessment' ? (
                     <div className="sprint-buttons-container">
                       <button
                         className="btn btn-primary view-plans-btn"
                         onClick={handleViewExistingRiskAssessments}
                       >
                         View Existing Plans
                       </button>
                       <button
                         className="btn btn-success start-planning-btn"
                         onClick={handleStartRiskAssessment}
                       >
                         Start Planning
                       </button>
                     </div>
                   ) : (
                     <>
                       <button
                         className="btn btn-success start-planning-btn"
                         onClick={() => handleFeatureSelect(selectedFeature)}
                       >
                         Start Feature
                       </button>
                       <p className="feature-description">
                         Generate professional reports from your data
                       </p>
                     </>
                   )}
                </>
              )}
            </div>



          </div>
        </div>
      </div>
      
      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-ring-large"></div>
            <div className="loading-text">Processing Your Document</div>
            <div className="loading-subtext">This may take a few moments...</div>
            <div className="upload-progress-container">
              <div className="upload-progress-bar">
                <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }}></div>
              </div>
              <div className="upload-progress-text">{Math.round(uploadProgress)}%</div>
            </div>
            <div className="upload-status-text">Parsing document content...</div>
          </div>
        </div>
      )}
      {showSowPrompt && (
        <div className="loading-overlay" onClick={() => {}}>
          <div className="sow-prompt">
            <h3 className="sow-title">Select SOW document (optional)</h3>
            <p className="sow-sub">Attach a Statement of Work (DOCX or PDF) to enrich the plan, or skip.</p>
            <div className="sow-actions">
              <input
                type="file"
                id="sow-inline-upload-2"
                accept=".docx,.pdf"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files && e.target.files[0];
                  if (!file) return;
                  const form = new FormData();
                  form.append('file', file);
                  if (user?.email) form.append('user_email', user.email);
                  try {
                    setSowUploading(true);
                    const resp = await fetch('/api/upload/sow', { method: 'POST', body: form });
                    const resj = await resp.json();
                    if (resj?.success) {
                      sessionStorage.setItem('sowContentRaw', resj?.data?.rawText || '');
                      sessionStorage.setItem('sowFileName', file.name);
                      // Store HTML content if available
                      if (resj?.data?.htmlContent) {
                        sessionStorage.setItem('sowContentHtml', resj.data.htmlContent);
                      }
                      setToastMessage('SOW attached');
                      setToastVisible(true);
                      setShowSowPrompt(false);
                      navigate(nextRoute || '/sprint-planning');
                    } else {
                      alert(resj?.error || 'Failed to read SOW');
                    }
                  } catch (err) {
                    alert('Failed to upload SOW');
                  } finally {
                    setSowUploading(false);
                  }
                }}
              />
              <div className="sow-buttons">
                <button className="btn btn-warning option-btn" onClick={() => document.getElementById('sow-inline-upload-2').click()} disabled={sowUploading}>
                  {sowUploading ? 'UPLOADING...' : 'CHOOSE SOW'}
                </button>
                <button className="btn btn-primary option-btn" onClick={() => { setShowSowPrompt(false); navigate(nextRoute || '/sprint-planning'); }}>
                  SKIP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {toastVisible && (
        <div className="toast success-toast">{toastMessage}</div>
      )}
      
      {showProfilePopup && <ProfilePopup />}
      {showMonitorModal && <MonitorModal />}
      {showAccessDeniedModal && <AccessDeniedModal />}
    </div>
  );
};

export default HomePage;
