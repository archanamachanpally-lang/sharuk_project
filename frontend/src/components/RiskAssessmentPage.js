import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './RiskAssessmentPage.css';

const RiskAssessmentPage = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  
  // Get user email once at component level
  const userEmail = user ? user.email : 'demo@example.com';

  // State management
  const [hasInteracted, setHasInteracted] = useState(false);
  const [activeTab, setActiveTab] = useState(null);
  const [savedData, setSavedData] = useState({});
  const [savedSections, setSavedSections] = useState(new Set());
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [savingSection, setSavingSection] = useState(null);
  const [currentRiskIndex, setCurrentRiskIndex] = useState(0);
  const [risks, setRisks] = useState([]);

  // Default risk structure
  const createDefaultRisk = () => ({
    id: Date.now() + Math.random(),
    RiskID: {
      RiskIDValue: '',
    },
    RiskDescription: {
      PrimarySource: '',
      SecondarySource: '',
    },
    Severity: {
      Source: '',
      AlternativeSource: '',
      SeverityValue: '',
    },
    Status: {
      StatusValue: '',
    },
    RiskOwner: {
      PrimarySource: '',
      SecondarySource: '',
    },
    DateIdentified: {
      DateIdentifiedValue: '',
    },
    MitigationPlan: {
      PrimarySource: '',
      SecondarySource: '',
    },
    RelevantNotes: {
      RelevantNotesValue: '',
    },
    Comments: {
      CommentsValue: '',
    },
    CustomField: {
      CustomFieldValue: '',
    },
    Priority: {
      PriorityValue: '',
    }
  });

  const [answers, setAnswers] = useState(createDefaultRisk());

  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [completedTabs, setCompletedTabs] = useState(new Set());
  const [showResetNotification, setShowResetNotification] = useState(false);
  const [showExcelLoadedNotification, setShowExcelLoadedNotification] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Load saved data on component mount
  useEffect(() => {
    // Check if a risk assessment was generated in the previous session
    const assessmentGenerated = localStorage.getItem('riskAssessmentGenerated');
    
    if (assessmentGenerated === 'true') {
      // An assessment was generated, start fresh
      localStorage.removeItem('riskAssessmentGenerated');
      localStorage.removeItem('riskAssessmentData');
      setShowResetNotification(true);
      setTimeout(() => setShowResetNotification(false), 3000);
      return;
    }

    // Check for Excel data from upload
    const excelData = sessionStorage.getItem('excelRiskData');
    if (excelData) {
      try {
        const parsedData = JSON.parse(excelData);
        console.log('🔍 [EXCEL LOAD] Excel data found:', parsedData);
        
        // Check if it's an array of risks or single risk
        if (Array.isArray(parsedData)) {
          console.log('🔍 [EXCEL LOAD] Multiple risks detected:', parsedData.length);
          console.log('🔍 [EXCEL LOAD] First risk data:', parsedData[0]);
          
          // Convert Excel data to risk objects
          const riskObjects = parsedData.map((riskData, index) => {
            const risk = createDefaultRisk();
            risk.id = `risk-${index + 1}`;
            console.log(`🔍 [EXCEL LOAD] Processing risk ${index + 1}:`, riskData);
            populateRiskWithExcelData(risk, riskData);
            console.log(`🔍 [EXCEL LOAD] Risk ${index + 1} after population:`, risk);
            return risk;
          });
          
          setRisks(riskObjects);
          setAnswers(riskObjects[0] || createDefaultRisk());
          setCurrentRiskIndex(0);
          console.log('🔍 [EXCEL LOAD] Created risk objects:', riskObjects);
          console.log('🔍 [EXCEL LOAD] Set answers to:', riskObjects[0]);
          
          // Force re-render to ensure UI updates
          setTimeout(() => {
            setAnswers(prev => ({ ...prev }));
          }, 100);
        } else {
          console.log('🔍 [EXCEL LOAD] Single risk detected, converting to array');
          // Convert single risk to array format
          const risk = createDefaultRisk();
          populateRiskWithExcelData(risk, parsedData);
          setRisks([risk]);
          setAnswers(risk);
          setCurrentRiskIndex(0);
          
          // Force re-render to ensure UI updates
          setTimeout(() => {
            setAnswers(prev => ({ ...prev }));
          }, 100);
        }
        
        // Show success notification
        setShowExcelLoadedNotification(true);
        setTimeout(() => setShowExcelLoadedNotification(false), 5000);
        
        // Clear the Excel data from sessionStorage after a delay to ensure it's loaded
        setTimeout(() => {
          sessionStorage.removeItem('excelRiskData');
        }, 1000);
        
      } catch (error) {
        console.error('Error parsing Excel data:', error);
      }
    }

    // Check for DOCX data from upload
    const docxData = sessionStorage.getItem('docxRiskData');
    if (docxData) {
      try {
        const parsedData = JSON.parse(docxData);
        console.log('DOCX data found, populating form:', parsedData);
        console.log('DOCX data type:', typeof parsedData);
        console.log('DOCX data keys:', Object.keys(parsedData));
        
        // Populate form fields with DOCX data
        populateFormWithDocxData(parsedData);
        
        // Clear the DOCX data from sessionStorage
        sessionStorage.removeItem('docxRiskData');
        
      } catch (error) {
        console.error('Error parsing DOCX data:', error);
      }
    }

    // Load previously saved data from localStorage
    const savedData = localStorage.getItem('riskAssessmentData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setSavedData(parsedData);
        
        // Set active tab to the first incomplete tab
        const firstIncompleteTab = Object.keys(parsedData).find(key => 
          !isTabCompleted(getTabNameFromSection(key))
        );
        
        if (firstIncompleteTab) {
          setActiveTab(getTabNameFromSection(firstIncompleteTab));
        } else {
          setActiveTab('riskid');
        }
        
        // Mark completed sections as saved
        const completedSections = new Set();
        Object.keys(parsedData).forEach(key => {
          if (isTabCompleted(getTabNameFromSection(key))) {
            completedSections.add(key);
          }
        });
        setSavedSections(completedSections);
        
      } catch (error) {
        console.error('Error parsing saved data:', error);
      }
    } else {
      // No saved data, start with riskid tab
      setActiveTab('riskid');
    }

    // Initialize with default risk if no Excel data was processed
    if (!sessionStorage.getItem('excelRiskData')) {
      const defaultRisk = createDefaultRisk();
      setRisks([defaultRisk]);
      setAnswers(defaultRisk);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const populateFormWithDocxData = (docxData) => {
    console.log('DOCX data received (LLM format):', docxData);
    
    // Create a completely new answers object to force re-render
    const newAnswers = {
      RiskID: {
        RiskIDValue: ''
      },
      RiskDescription: {
        PrimarySource: ''
      },
      Severity: {
        SeverityValue: ''
      },
      Status: {
        StatusValue: ''
      },
      RiskOwner: {
        RiskOwnerValue: ''
      },
      DateIdentified: {
        DateIdentifiedValue: ''
      },
      MitigationPlan: {
        MitigationPlanValue: ''
      },
      RelevantNotes: {
        RelevantNotesValue: ''
      }
    };
    
    // Handle the new LLM-structured format for risk assessment
    if (docxData.riskAssessment) {
      const riskAssessment = docxData.riskAssessment;
      
      // Populate Risk ID
      if (riskAssessment.riskID) {
        newAnswers.RiskID.RiskIDValue = String(riskAssessment.riskID);
      }
      
      // Populate Risk Description
      if (riskAssessment.riskDescription) {
        newAnswers.RiskDescription.PrimarySource = String(riskAssessment.riskDescription);
      }
      
      // Populate Severity
      if (riskAssessment.severity) {
        newAnswers.Severity.SeverityValue = String(riskAssessment.severity);
      }
      
      // Populate Status
      if (riskAssessment.status) {
        newAnswers.Status.StatusValue = String(riskAssessment.status);
      }
      
      // Populate Risk Owner
      if (riskAssessment.riskOwner) {
        newAnswers.RiskOwner.RiskOwnerValue = String(riskAssessment.riskOwner);
      }
      
      // Populate Date Identified
      if (riskAssessment.dateIdentified) {
        newAnswers.DateIdentified.DateIdentifiedValue = String(riskAssessment.dateIdentified);
      }
      
      // Populate Mitigation Plan
      if (riskAssessment.mitigationPlan) {
        newAnswers.MitigationPlan.MitigationPlanValue = String(riskAssessment.mitigationPlan);
      }
      
      // Populate Relevant Notes
      if (riskAssessment.relevantNotes) {
        newAnswers.RelevantNotes.RelevantNotesValue = String(riskAssessment.relevantNotes);
      }
    } else {
      // Fallback to old format for backward compatibility
      console.log('Using fallback format for DOCX data');
      
      // Extract Risk ID from text
      const riskIdMatch = docxData.raw_text?.match(/Risk\s+ID[:\s]*([^\n]+)/i);
      if (riskIdMatch) {
        newAnswers.RiskID.RiskIDValue = String(riskIdMatch[1].trim());
      }
      
      // Extract Risk Description from text
      const riskDescMatch = docxData.raw_text?.match(/Risk\s+Description[:\s]*([^\n]+)/i);
      if (riskDescMatch) {
        newAnswers.RiskDescription.PrimarySource = String(riskDescMatch[1].trim());
      }
      
      // Extract Severity from text
      const severityMatch = docxData.raw_text?.match(/Severity[:\s]*([^\n]+)/i);
      if (severityMatch) {
        newAnswers.Severity.SeverityValue = String(severityMatch[1].trim());
      }
      
      // Extract Status from text
      const statusMatch = docxData.raw_text?.match(/Status[:\s]*([^\n]+)/i);
      if (statusMatch) {
        newAnswers.Status.StatusValue = String(statusMatch[1].trim());
      }
      
      // Extract Risk Owner from text
      const ownerMatch = docxData.raw_text?.match(/Risk\s+Owner[:\s]*([^\n]+)/i);
      if (ownerMatch) {
        newAnswers.RiskOwner.RiskOwnerValue = String(ownerMatch[1].trim());
      }
      
      // Extract Date Identified from text
      const dateMatch = docxData.raw_text?.match(/Date\s+Identified[:\s]*([^\n]+)/i);
      if (dateMatch) {
        newAnswers.DateIdentified.DateIdentifiedValue = String(dateMatch[1].trim());
      }
      
      // Extract Mitigation Plan from text
      const mitigationMatch = docxData.raw_text?.match(/Mitigation\s+Plan[:\s]*([^\n]+)/i);
      if (mitigationMatch) {
        newAnswers.MitigationPlan.MitigationPlanValue = String(mitigationMatch[1].trim());
      }
      
      // Extract Relevant Notes from text
      const notesMatch = docxData.raw_text?.match(/Relevant\s+Notes[:\s]*([^\n]+)/i);
      if (notesMatch) {
        newAnswers.RelevantNotes.RelevantNotesValue = String(notesMatch[1].trim());
      }
    }
    
    // Force a complete state update
    setAnswers(newAnswers);
    console.log('Form populated with DOCX data:', newAnswers);
    
    // Show success notification
    alert('DOCX data successfully loaded and form populated!');
    
    // Force re-render by updating a timestamp
    setTimeout(() => {
      setAnswers(prev => ({ ...prev }));
    }, 100);
  };

  // Function to populate a single risk object with Excel data
  const populateRiskWithExcelData = (risk, excelData) => {
    console.log('🔍 [EXCEL MAPPING] Populating risk with Excel data:', excelData);
    
    // CORRECTED CSV format mapping based on actual Excel structure with N/A autofill
    risk.RiskID.RiskIDValue = excelData['Issue key'] || 'N/A';
    console.log('✅ Mapped Issue key:', risk.RiskID.RiskIDValue);
    
    risk.RiskDescription.PrimarySource = excelData['Summary'] || 'N/A';
    console.log('✅ Mapped Summary:', risk.RiskDescription.PrimarySource);
    
    // CORRECTED: Description should go to Severity field (which is labeled as Description in UI)
    risk.Severity.SeverityValue = excelData['Description'] || 'N/A';
    console.log('✅ Mapped Description to Severity:', risk.Severity.SeverityValue);
    
    risk.Priority.PriorityValue = excelData['Priority'] || 'N/A';
    console.log('✅ Mapped Priority:', risk.Priority.PriorityValue);
    
    // CORRECTED: Status should go to Status field, not RiskOwner
    risk.Status.StatusValue = excelData['Status'] || 'N/A';
    console.log('✅ Mapped Status:', risk.Status.StatusValue);
    
    // CORRECTED: Assignee should go to RiskOwner, not DateIdentified
    risk.RiskOwner.PrimarySource = excelData['Assignee'] || 'N/A';
    console.log('✅ Mapped Assignee to RiskOwner:', risk.RiskOwner.PrimarySource);
    
    // CORRECTED: Reporter should go to RiskOwner SecondarySource
    risk.RiskOwner.SecondarySource = excelData['Reporter'] || 'N/A';
    console.log('✅ Mapped Reporter to RiskOwner Secondary:', risk.RiskOwner.SecondarySource);
    
    // CORRECTED: Created should go to DateIdentified, not RelevantNotes with N/A autofill
    if (excelData['Created']) {
      // Handle date format conversion from YYYY-MM-DD to form format
      const createdDate = excelData['Created'];
      if (createdDate && typeof createdDate === 'string') {
        // If it's already in YYYY-MM-DD format, use it directly
        if (createdDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          risk.DateIdentified.DateIdentifiedValue = createdDate;
        } else {
          // Try to convert other date formats to YYYY-MM-DD
          try {
            const date = new Date(createdDate);
            if (!isNaN(date.getTime())) {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              risk.DateIdentified.DateIdentifiedValue = `${year}-${month}-${day}`;
            } else {
              risk.DateIdentified.DateIdentifiedValue = createdDate;
            }
          } catch (error) {
            risk.DateIdentified.DateIdentifiedValue = createdDate;
          }
        }
      } else {
        risk.DateIdentified.DateIdentifiedValue = createdDate;
      }
      console.log('✅ Mapped Created to DateIdentified:', createdDate);
    } else {
      risk.DateIdentified.DateIdentifiedValue = 'N/A';
      console.log('✅ Mapped Created to DateIdentified: N/A (autofilled)');
    }
    
    risk.Comments.CommentsValue = excelData['Comments'] || 'N/A';
    console.log('✅ Mapped Comments:', risk.Comments.CommentsValue);
    
    risk.CustomField.CustomFieldValue = excelData['Risk/Mitigation'] || 'N/A';
    console.log('✅ Mapped Custom field:', risk.CustomField.CustomFieldValue);
    
    console.log('🔍 [EXCEL MAPPING] Final mapped risk data with N/A autofill:', risk);
  };

  // eslint-disable-next-line no-unused-vars
  const populateFormWithExcelData = (excelData) => {
    const newAnswers = { ...answers };
    
    console.log('🔍 [EXCEL MAPPING] Raw Excel data received:', excelData);
    
    // Use the new populateRiskWithExcelData function
    populateRiskWithExcelData(newAnswers, excelData);
    
    console.log('🔍 [EXCEL MAPPING] Final mapped data:', newAnswers);
    console.log('🔍 [EXCEL MAPPING] Setting answers state...');
    
    setAnswers(newAnswers);
    
    // Mark all populated sections as saved
    const newSavedSections = new Set();
    Object.keys(excelData).forEach(key => {
      if (excelData[key] && excelData[key] !== '') {
        newSavedSections.add(key);
      }
    });
    setSavedSections(newSavedSections);
    
    // Show success notification
    setShowExcelLoadedNotification(true);
    setTimeout(() => setShowExcelLoadedNotification(false), 5000);
    
    // Set active tab to show the populated data
    setActiveTab('riskID');
    
    console.log('🔍 [EXCEL MAPPING] Form populated successfully with Excel data');
    
    // Fallback to old format for backward compatibility
    if (excelData.riskID && excelData.riskID.riskIDValue) {
      newAnswers.RiskID.RiskIDValue = excelData.riskID.riskIDValue;
    }
    
    if (excelData.riskDescription && excelData.riskDescription.primarySource) {
      newAnswers.RiskDescription.PrimarySource = excelData.riskDescription.primarySource;
    }
    if (excelData.riskDescription && excelData.riskDescription.secondarySource) {
      newAnswers.RiskDescription.SecondarySource = excelData.riskDescription.secondarySource;
    }
    
    if (excelData.severity && excelData.severity.severityValue) {
      newAnswers.Severity.SeverityValue = excelData.severity.severityValue;
    }
    
    if (excelData.priority && excelData.priority.priorityValue) {
      newAnswers.Priority.PriorityValue = excelData.priority.priorityValue;
    }
    
    if (excelData.status && excelData.status.statusValue) {
      newAnswers.RiskOwner.PrimarySource = excelData.status.statusValue;
    }
    
    if (excelData.riskOwner && excelData.riskOwner.primarySource) {
      newAnswers.DateIdentified.DateIdentifiedValue = excelData.riskOwner.primarySource;
    }
    
    if (excelData.mitigationPlan && excelData.mitigationPlan.secondarySource) {
      newAnswers.MitigationPlan.SecondarySource = excelData.mitigationPlan.secondarySource;
    }
    
    if (excelData.relevantNotes && excelData.relevantNotes.relevantNotesValue) {
      // Handle date format conversion for fallback format
      const createdDate = excelData.relevantNotes.relevantNotesValue;
      if (createdDate && typeof createdDate === 'string') {
        // If it's already in YYYY-MM-DD format, use it directly
        if (createdDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          newAnswers.RelevantNotes.RelevantNotesValue = createdDate;
        } else {
          // Try to convert other date formats to YYYY-MM-DD
          try {
            const date = new Date(createdDate);
            if (!isNaN(date.getTime())) {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              newAnswers.RelevantNotes.RelevantNotesValue = `${year}-${month}-${day}`;
            } else {
              newAnswers.RelevantNotes.RelevantNotesValue = createdDate;
            }
          } catch (error) {
            newAnswers.RelevantNotes.RelevantNotesValue = createdDate;
          }
        }
      } else {
        newAnswers.RelevantNotes.RelevantNotesValue = createdDate;
      }
    }
    
    if (excelData.comments && excelData.comments.commentsValue) {
      newAnswers.Comments.CommentsValue = excelData.comments.commentsValue;
    }
    
    if (excelData.customField && excelData.customField.customFieldValue) {
      newAnswers.CustomField.CustomFieldValue = excelData.customField.customFieldValue;
    }
    
    console.log('Form populated with CSV/Excel data:', newAnswers);
  };

  const handleTabClick = (tabName) => {
    if (!hasInteracted) {
      setHasInteracted(true);
    }
    setActiveTab(tabName);
    
    // Add a subtle animation effect
    const contentArea = document.querySelector('.content-area');
    if (contentArea) {
      contentArea.style.opacity = '0';
      contentArea.style.transform = 'translateX(20px)';
      setTimeout(() => {
        contentArea.style.opacity = '1';
        contentArea.style.transform = 'translateX(0)';
      }, 150);
    }
  };

  // Risk navigation functions
  const switchToRisk = (index) => {
    if (index >= 0 && index < risks.length) {
      setCurrentRiskIndex(index);
      setAnswers(risks[index]);
      setActiveTab(null); // Reset active tab when switching risks
    }
  };

  const updateCurrentRisk = (updatedRisk) => {
    const newRisks = [...risks];
    newRisks[currentRiskIndex] = updatedRisk;
    setRisks(newRisks);
    setAnswers(updatedRisk);
  };

  const addNewRisk = () => {
    const newRisk = createDefaultRisk();
    newRisk.id = `risk-${Date.now()}`;
    newRisk.RiskID.RiskIDValue = `RISK-${String(risks.length + 1).padStart(3, '0')}`;
    
    const newRisks = [...risks, newRisk];
    setRisks(newRisks);
    setCurrentRiskIndex(newRisks.length - 1);
    setAnswers(newRisk);
    setActiveTab(null); // Reset active tab when adding new risk
    
    console.log('🔍 [ADD RISK] Added new risk:', newRisk);
    console.log('🔍 [ADD RISK] Total risks now:', newRisks.length);
  };

  const deleteCurrentRisk = () => {
    if (risks.length <= 1) {
      alert('Cannot delete the last risk. You need at least one risk.');
      return;
    }
    
    const confirmed = window.confirm(`Are you sure you want to delete ${answers.RiskID?.RiskIDValue || 'this risk'}?`);
    if (!confirmed) return;
    
    const newRisks = risks.filter((_, index) => index !== currentRiskIndex);
    setRisks(newRisks);
    
    // Switch to the previous risk or first risk
    const newIndex = currentRiskIndex > 0 ? currentRiskIndex - 1 : 0;
    setCurrentRiskIndex(newIndex);
    setAnswers(newRisks[newIndex]);
    setActiveTab(null);
    
    console.log('🔍 [DELETE RISK] Deleted risk, remaining:', newRisks.length);
  };

  const handleInputChange = (section, key, value) => {
    const updatedRisk = {
      ...answers,
      [section]: {
        ...answers[section],
        [key]: value
      }
    };
    setAnswers(updatedRisk);
    updateCurrentRisk(updatedRisk);
  };

  const getTabNameFromSection = (section) => {
    const sectionMap = {
      'RiskID': 'riskid',
      'RiskDescription': 'description',
      'Severity': 'severity',
      'Priority': 'priority',
      'Status': 'status',
      'RiskOwner': 'owner',
      'DateIdentified': 'date',
      'MitigationPlan': 'mitigation',
      'RelevantNotes': 'notes',
      'Comments': 'comments',
      'CustomField': 'customfield'
    };
    return sectionMap[section] || 'riskid';
  };

  const getSectionFromTabName = (tabName) => {
    const tabMap = {
      'riskid': 'RiskID',
      'description': 'RiskDescription',
      'severity': 'Severity',
      'priority': 'Priority',
      'status': 'Status',
      'owner': 'RiskOwner',
      'date': 'DateIdentified',
      'mitigation': 'MitigationPlan',
      'notes': 'RelevantNotes',
      'comments': 'Comments',
      'customfield': 'CustomField'
    };
    return tabMap[tabName] || 'RiskID';
  };

  const isTabCompleted = (tabName) => {
    const section = getSectionFromTabName(tabName);
    const sectionData = answers[section];
    
    if (!sectionData) return false;
    
    // Check if any field in the section has a value (more flexible completion)
    return Object.values(sectionData).some(value => 
      value !== null && value !== undefined && value.toString().trim() !== ''
    );
  };

  const getMissingTabs = () => {
    const allTabs = ['riskid', 'description', 'severity', 'priority', 'status', 'owner', 'date', 'comments', 'customfield'];
    
    // If we have multiple risks, check if ALL risks have completed the required tabs
    if (risks.length > 1) {
      const incompleteRisks = [];
      
      risks.forEach((risk, riskIndex) => {
        const riskMissingTabs = allTabs.filter(tab => {
          const section = getSectionFromTab(tab);
          return !isRiskSectionCompleted(risk, section);
        });
        
        if (riskMissingTabs.length > 0) {
          incompleteRisks.push({
            riskId: risk.RiskID?.RiskIDValue || `Risk ${riskIndex + 1}`,
            missingTabs: riskMissingTabs
          });
        }
      });
      
      if (incompleteRisks.length > 0) {
        return [`Incomplete risks: ${incompleteRisks.map(r => `${r.riskId} (${r.missingTabs.join(', ')})`).join('; ')}`];
      }
      
      return []; // All risks are complete
    } else {
      // Single risk - use original logic
      return allTabs.filter(tab => !isTabCompleted(tab));
    }
  };
  
  // Helper function to check if a specific risk section is completed
  const isRiskSectionCompleted = (risk, section) => {
    const sectionData = risk[section];
    if (!sectionData) return false;
    
    return Object.values(sectionData).some(value => 
      value !== null && value !== undefined && value.toString().trim() !== ''
    );
  };
  
  // Helper function to get section name from tab name
  const getSectionFromTab = (tab) => {
    const tabToSectionMap = {
      'riskid': 'RiskID',
      'description': 'RiskDescription',
      'severity': 'Severity',
      'priority': 'Priority',
      'status': 'Status',
      'owner': 'RiskOwner',
      'date': 'DateIdentified',
      'comments': 'Comments',
      'customfield': 'CustomField'
    };
    return tabToSectionMap[tab] || tab;
  };

  const handleSave = async (section) => {
    setSavingSection(section);
    
    try {
      const sectionData = answers[section];
      const updatedSavedData = { ...savedData, [section]: sectionData };
      
      // Save to localStorage
      localStorage.setItem('riskAssessmentData', JSON.stringify(updatedSavedData));
      setSavedData(updatedSavedData);
      
      // Mark section as saved
      setSavedSections(prev => new Set([...prev, section]));
      
      // Show success animation
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 2000);
      
    } catch (error) {
      console.error('Error saving section:', error);
      alert('Error saving section. Please try again.');
    } finally {
      setSavingSection(null);
    }
  };

  const handleReset = (section = null) => {
    if (section) {
      // Reset specific section
      const defaultData = getDefaultSectionData(section);
      setAnswers(prev => ({
        ...prev,
        [section]: defaultData
      }));
      
      // Remove from saved sections
      setSavedSections(prev => {
        const newSet = new Set(prev);
        newSet.delete(section);
        return newSet;
      });
      
      // Update saved data
      const updatedSavedData = { ...savedData };
      delete updatedSavedData[section];
      localStorage.setItem('riskAssessmentData', JSON.stringify(updatedSavedData));
      setSavedData(updatedSavedData);
      
    } else {
      // Reset entire form
      setAnswers({
        RiskID: { RiskIDValue: '' },
        RiskDescription: { RiskDescriptionValue: '' },
        Severity: { SeverityValue: 'Medium' },
        Status: { StatusValue: 'Open' },
        RiskOwner: { RiskOwnerValue: '' },
        DateIdentified: { DateIdentifiedValue: '' },
        MitigationPlan: { MitigationPlanValue: '' },
        RelevantNotes: { RelevantNotesValue: '' },
        Comments: { CommentsValue: '' },
        CustomField: { CustomFieldValue: '' },
        Priority: { PriorityValue: 'Medium' }
      });
      
      setSavedData({});
      setSavedSections(new Set());
      setActiveTab('riskid');
      localStorage.removeItem('riskAssessmentData');
    }
  };

  const getDefaultSectionData = (section) => {
    switch (section) {
      case 'RiskID':
        return { RiskIDValue: '' };
      case 'RiskDescription':
        return { PrimarySource: '', SecondarySource: '' };
      case 'Severity':
        return { Source: '', AlternativeSource: '', SeverityValue: 'Medium' };
      case 'Status':
        return { StatusValue: 'Open' };
      case 'RiskOwner':
        return { PrimarySource: '', SecondarySource: '' };
      case 'DateIdentified':
        return { DateIdentifiedValue: '' };
      case 'MitigationPlan':
        return { PrimarySource: '', SecondarySource: '' };
      case 'RelevantNotes':
        return { RelevantNotesValue: '' };
      case 'Comments':
        return { CommentsValue: '' };
      case 'CustomField':
        return { CustomFieldValue: '' };
      case 'Priority':
        return { PriorityValue: 'Medium' };
      default:
        return {};
    }
  };

  const handleGenerateAssessment = async () => {
    const missingTabs = getMissingTabs();
    if (missingTabs.length > 0) {
      alert(`Please complete the following tabs first:\n${missingTabs.join('\n')}`);
      return;
    }

    setLoading(true);
    setLoadingProgress(0);
    setLoadingMessage('');
    
    // Simulate realistic progress based on processing stages
    const progressStages = [
      { progress: 15, message: `Analyzing ${risks.length} risk(s) data...` },
      { progress: 35, message: "Evaluating severity levels across all risks..." },
      { progress: 55, message: "Assessing mitigation strategies for all risks..." },
      { progress: 75, message: "Generating comprehensive AI response..." },
      { progress: 90, message: "Finalizing multi-risk assessment..." }
    ];
    
    let currentStage = 0;
    const progressInterval = setInterval(() => {
      if (currentStage < progressStages.length) {
        setLoadingProgress(progressStages[currentStage].progress);
        setLoadingMessage(progressStages[currentStage].message);
        currentStage++;
      }
    }, 800);
    
    try {
      // Transform ALL risks data to match the expected risk assessment structure
      console.log('🔍 [GENERATE] Processing all risks:', risks.length);
      
      // Get the first risk for project overview (or use current risk if no risks array)
      const primaryRisk = risks.length > 0 ? risks[0] : answers;
      
      // Build comprehensive risk data from all risks
      const allRisksData = risks.map((risk, index) => ({
        riskId: risk.RiskID?.RiskIDValue || `Risk-${index + 1}`,
        summary: risk.RiskDescription?.PrimarySource || '',
        description: risk.Severity?.SeverityValue || '',
        priority: risk.Priority?.PriorityValue || 'Medium',
        status: risk.Status?.StatusValue || 'Open',
        assignee: risk.RiskOwner?.PrimarySource || '',
        reporter: risk.RiskOwner?.SecondarySource || '',
        createdDate: risk.DateIdentified?.DateIdentifiedValue || '',
        comments: risk.Comments?.CommentsValue || '',
        mitigation: risk.CustomField?.CustomFieldValue || ''
      }));
      
      // Build comprehensive risk categories from all risks
      const riskCategories = risks.map((risk, index) => ({
        categoryName: risk.RiskID?.RiskIDValue || `Risk ${index + 1}`,
        description: risk.RiskDescription?.PrimarySource || 'Risk identified',
        severity: risk.Severity?.SeverityValue || 'Medium',
        priority: risk.Priority?.PriorityValue || 'Medium',
        status: risk.Status?.StatusValue || 'Open'
      }));
      
      // Build comprehensive stakeholders from all risks
      const allStakeholders = [];
      risks.forEach((risk, index) => {
        if (risk.RiskOwner?.PrimarySource) {
          allStakeholders.push({
            name: risk.RiskOwner.PrimarySource,
            role: 'Risk Owner',
            responsibility: `Risk management for ${risk.RiskID?.RiskIDValue || `Risk ${index + 1}`}`
          });
        }
        if (risk.RiskOwner?.SecondarySource && risk.RiskOwner.SecondarySource !== risk.RiskOwner.PrimarySource) {
          allStakeholders.push({
            name: risk.RiskOwner.SecondarySource,
            role: 'Reporter',
            responsibility: `Risk reporting for ${risk.RiskID?.RiskIDValue || `Risk ${index + 1}`}`
          });
        }
      });
      
      // Remove duplicate stakeholders
      const uniqueStakeholders = allStakeholders.filter((stakeholder, index, self) => 
        index === self.findIndex(s => s.name === stakeholder.name)
      );
      
      // Build comprehensive risk matrix content
      const riskMatrixContent = risks.map(risk => 
        `Risk ID: ${risk.RiskID?.RiskIDValue || 'N/A'}\n` +
        `Summary: ${risk.RiskDescription?.PrimarySource || ''}\n` +
        `Severity: ${risk.Severity?.SeverityValue || 'Medium'}\n` +
        `Status: ${risk.Status?.StatusValue || 'Open'}\n` +
        `Priority: ${risk.Priority?.PriorityValue || 'Medium'}\n` +
        `Assignee: ${risk.RiskOwner?.PrimarySource || ''}\n` +
        `Reporter: ${risk.RiskOwner?.SecondarySource || ''}\n` +
        `Created: ${risk.DateIdentified?.DateIdentifiedValue || ''}\n` +
        `Comments: ${risk.Comments?.CommentsValue || ''}\n` +
        `Mitigation: ${risk.CustomField?.CustomFieldValue || ''}\n` +
        `---\n`
      ).join('\n');
      
      // Build comprehensive risk register content
      const riskRegisterContent = risks.map(risk => 
        `Risk ID: ${risk.RiskID?.RiskIDValue || 'N/A'}\n` +
        `Risk Description: ${risk.RiskDescription?.PrimarySource || ''}\n` +
        `Detailed Description: ${risk.Severity?.SeverityValue || ''}\n` +
        `Priority: ${risk.Priority?.PriorityValue || 'Medium'}\n` +
        `Status: ${risk.Status?.StatusValue || 'Open'}\n` +
        `Assignee: ${risk.RiskOwner?.PrimarySource || ''}\n` +
        `Reporter: ${risk.RiskOwner?.SecondarySource || ''}\n` +
        `Created Date: ${risk.DateIdentified?.DateIdentifiedValue || ''}\n` +
        `Mitigation Plan: ${risk.CustomField?.CustomFieldValue || ''}\n` +
        `Comments: ${risk.Comments?.CommentsValue || ''}\n` +
        `Notes: ${risk.RelevantNotes?.RelevantNotesValue || ''}\n` +
        `---\n`
      ).join('\n');
      
      // Get the current workspace ID from localStorage
      const selectedWorkspace = JSON.parse(localStorage.getItem('selectedWorkspace') || '{}');
      
      const requestData = {
        project_overview: {
          ProjectName: primaryRisk.RiskID?.RiskIDValue || 'Multi-Risk Assessment Project',
          ProjectDates: primaryRisk.DateIdentified?.DateIdentifiedValue || new Date().toISOString().split('T')[0],
          ProjectDuration: 'Multi-Risk Assessment',
          TeamName: 'Risk Management Team',
          ProjectScope: `Comprehensive risk assessment for ${risks.length} identified risks`
        },
        risk_categories: {
          RiskCategories: riskCategories,
          RiskMitigation: risks.map(r => r.CustomField?.CustomFieldValue || '').filter(m => m).join('\n---\n'),
          RiskMonitoring: risks.map(r => r.Comments?.CommentsValue || '').filter(c => c).join('\n---\n')
        },
        stakeholders: {
          Stakeholders: uniqueStakeholders.length > 0 ? uniqueStakeholders : [{
            name: 'Risk Management Team',
            role: 'Risk Owner',
            responsibility: 'Overall risk management and mitigation'
          }]
        },
        risk_matrix: {
          RiskMatrixContent: riskMatrixContent
        },
        risk_register: {
          RiskRegisterContent: riskRegisterContent
        },
        additional_comments: {
          CommentsContent: `Comprehensive risk assessment covering ${risks.length} risks. All risks have been analyzed and included in this assessment.`
        },
        all_risks_data: allRisksData, // Include raw risk data for LLM processing
        user_email: userEmail,
        workspace_id: selectedWorkspace?.id || null
      };

      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/risk-assessment/generate-assessment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });


      if (!response.ok) {
        const errorText = await response.text();
        console.error('🚀 [DEBUG] Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      
      // Check if the response has the expected data
      if (!result.success) {
        console.error('🚀 [DEBUG] API returned success: false:', result.message);
        throw new Error(`API Error: ${result.message}`);
      }
      
      // Set a flag indicating that an assessment was successfully generated
      localStorage.setItem('riskAssessmentGenerated', 'true');

      // Reset the form after successful assessment generation
      handleReset();

      // Navigate to results page with the generated assessment
      navigate('/risk-results', { 
        state: { 
          riskAssessment: result,
          originalData: requestData,
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

    } catch (error) {
      console.error('Error generating risk assessment:', error);
      alert('Error generating risk assessment. Please try again.');
    } finally {
      clearInterval(progressInterval);
      setLoadingProgress(100);
      setTimeout(() => {
        setLoading(false);
        setLoadingProgress(0);
      }, 500);
    }
  };

  // Update completion status when answers change
  useEffect(() => {
    const allTabs = ['riskid', 'description', 'severity', 'priority', 'status', 'owner', 'date', 'comments', 'customfield'];
    const newCompletedTabs = new Set();
    
    allTabs.forEach(tab => {
      if (isTabCompleted(tab)) {
        newCompletedTabs.add(tab);
      }
    });
    
    setCompletedTabs(newCompletedTabs);
  }, [answers]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderContent = () => {
    if (!activeTab) {
      return (
        <div className="welcome-content">
          <h2>Welcome to Risk Assessment</h2>
          <p>
            Create comprehensive risk assessments by filling out each section below. 
            Start with the Risk ID and work your way through each tab to create a detailed risk assessment.
          </p>
          
          {Object.keys(savedData).length > 0 && (
            <div className="saved-data-summary">
              <h3>Your Progress</h3>
              <div className="summary-grid">
                {Object.entries(savedData).map(([section, data]) => {
                  const tabName = getTabNameFromSection(section);
                  const isCompleted = isTabCompleted(tabName);
                  return (
                    <div key={section} className={`summary-item ${isCompleted ? 'completed' : ''}`}>
                      <span>{section.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span>{isCompleted ? '✓ Complete' : 'In Progress'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }

    switch (activeTab) {
      case 'riskid':
        return (
          <div className="accordion-content">
            <h3>Issue Key</h3>
            <div className="input-row">
              <input
                type="text"
                className="input-box"
                value={answers.RiskID.RiskIDValue}
                onChange={(e) => handleInputChange('RiskID', 'RiskIDValue', e.target.value)}
                placeholder="Enter Issue Key"
              />
            </div>
            
            <div className="tab-actions">
              <button
                className={`btn ${savingSection === 'RiskID' ? 'btn-secondary' : 'btn-success'}`}
                onClick={() => handleSave('RiskID')}
                disabled={savingSection === 'RiskID'}
              >
                {savingSection === 'RiskID' ? 'Saving...' : 
                 savedSections.has('RiskID') ? 'Saved ✓' : 'Save Section'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleReset('RiskID')}
              >
                Reset Section
              </button>
            </div>
          </div>
        );

      case 'description':
        return (
          <div className="accordion-content">
            <h3>Summary</h3>
            <div className="input-row">
              <label className="input-label">Summary</label>
              <textarea
                className="textarea-input"
                value={answers.RiskDescription.PrimarySource}
                onChange={(e) => handleInputChange('RiskDescription', 'PrimarySource', e.target.value)}
                rows="4"
              />
            </div>
            
            <div className="tab-actions">
              <button
                className={`btn ${savingSection === 'RiskDescription' ? 'btn-secondary' : 'btn-success'}`}
                onClick={() => handleSave('RiskDescription')}
                disabled={savingSection === 'RiskDescription'}
              >
                {savingSection === 'RiskDescription' ? 'Saving...' : 
                 savedSections.has('RiskDescription') ? 'Saved ✓' : 'Save Section'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleReset('RiskDescription')}
              >
                Reset Section
              </button>
            </div>
          </div>
        );

      case 'severity':
        return (
          <div className="accordion-content">
            <h3>Description</h3>
            <div className="input-row">
              <label className="input-label">Description</label>
              <textarea
                className="textarea-input"
                value={answers.Severity.SeverityValue}
                onChange={(e) => handleInputChange('Severity', 'SeverityValue', e.target.value)}
                rows="4"
              />
            </div>
            
            <div className="tab-actions">
              <button
                className={`btn ${savingSection === 'Severity' ? 'btn-secondary' : 'btn-success'}`}
                onClick={() => handleSave('Severity')}
                disabled={savingSection === 'Severity'}
              >
                {savingSection === 'Severity' ? 'Saving...' : 
                 savedSections.has('Severity') ? 'Saved ✓' : 'Save Section'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleReset('Severity')}
              >
                Reset Section
              </button>
            </div>
          </div>
        );

      case 'priority':
        return (
          <div className="accordion-content">
            <h3>Priority</h3>
            <div className="input-row">
              <label className="input-label">Priority Level</label>
              <select
                className="input-box"
                value={answers.Priority.PriorityValue}
                onChange={(e) => handleInputChange('Priority', 'PriorityValue', e.target.value)}
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            
            <div className="tab-actions">
              <button
                className={`btn ${savingSection === 'Priority' ? 'btn-secondary' : 'btn-success'}`}
                onClick={() => handleSave('Priority')}
                disabled={savingSection === 'Priority'}
              >
                {savingSection === 'Priority' ? 'Saving...' : 
                 savedSections.has('Priority') ? 'Saved ✓' : 'Save Section'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleReset('Priority')}
              >
                Reset Section
              </button>
            </div>
          </div>
        );

      case 'status':
        return (
          <div className="accordion-content">
            <h3>Status</h3>
            <div className="input-row">
              <label className="input-label">Status</label>
              <select
                className="input-box"
                value={answers.Status.StatusValue}
                onChange={(e) => handleInputChange('Status', 'StatusValue', e.target.value)}
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Ready for QA">Ready for QA</option>
                <option value="Closed">Closed</option>
                <option value="Done">Done</option>
              </select>
            </div>
            
            <div className="tab-actions">
              <button
                className={`btn ${savingSection === 'Status' ? 'btn-secondary' : 'btn-success'}`}
                onClick={() => handleSave('Status')}
                disabled={savingSection === 'Status'}
              >
                {savingSection === 'Status' ? 'Saving...' : 
                 savedSections.has('Status') ? 'Saved ✓' : 'Save Section'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleReset('Status')}
              >
                Reset Section
              </button>
            </div>
          </div>
        );

      case 'owner':
        return (
          <div className="accordion-content">
            <h3>Assignee</h3>
            <div className="input-row">
              <label className="input-label">Assignee</label>
              <textarea
                className="textarea-input"
                value={answers.RiskOwner.PrimarySource}
                onChange={(e) => handleInputChange('RiskOwner', 'PrimarySource', e.target.value)}
                rows="3"
              />
            </div>
            
            <div className="input-row">
              <label className="input-label">Reporter</label>
              <textarea
                className="textarea-input"
                value={answers.RiskOwner.SecondarySource}
                onChange={(e) => handleInputChange('RiskOwner', 'SecondarySource', e.target.value)}
                rows="3"
              />
            </div>
            
            <div className="tab-actions">
              <button
                className={`btn ${savingSection === 'RiskOwner' ? 'btn-secondary' : 'btn-success'}`}
                onClick={() => handleSave('RiskOwner')}
                disabled={savingSection === 'RiskOwner'}
              >
                {savingSection === 'RiskOwner' ? 'Saving...' : 
                 savedSections.has('RiskOwner') ? 'Saved ✓' : 'Save Section'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleReset('RiskOwner')}
              >
                Reset Section
              </button>
            </div>
          </div>
        );

      case 'date':
        return (
          <div className="accordion-content">
            <h3>Created Date</h3>
            <div className="input-row">
              <label className="input-label">Created Date</label>
              <input
                type="date"
                className="input-box"
                value={answers.DateIdentified.DateIdentifiedValue}
                onChange={(e) => handleInputChange('DateIdentified', 'DateIdentifiedValue', e.target.value)}
              />
            </div>
            
            <div className="tab-actions">
              <button
                className={`btn ${savingSection === 'DateIdentified' ? 'btn-secondary' : 'btn-success'}`}
                onClick={() => handleSave('DateIdentified')}
                disabled={savingSection === 'DateIdentified'}
              >
                {savingSection === 'DateIdentified' ? 'Saving...' : 
                 savedSections.has('DateIdentified') ? 'Saved ✓' : 'Save Section'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleReset('DateIdentified')}
              >
                Reset Section
              </button>
            </div>
          </div>
        );

      case 'mitigation':
        return (
          <div className="accordion-content">
            <h3>Reporter</h3>
            <div className="input-row">
              <label className="input-label">Reporter</label>
              <textarea
                className="textarea-input"
                value={answers.MitigationPlan.SecondarySource}
                onChange={(e) => handleInputChange('MitigationPlan', 'SecondarySource', e.target.value)}
                rows="4"
              />
            </div>
            
            <div className="tab-actions">
              <button
                className={`btn ${savingSection === 'MitigationPlan' ? 'btn-secondary' : 'btn-success'}`}
                onClick={() => handleSave('MitigationPlan')}
                disabled={savingSection === 'MitigationPlan'}
              >
                {savingSection === 'MitigationPlan' ? 'Saving...' : 
                 savedSections.has('MitigationPlan') ? 'Saved ✓' : 'Save Section'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleReset('MitigationPlan')}
              >
                Reset Section
              </button>
            </div>
          </div>
        );

      case 'notes':
        return (
          <div className="accordion-content">
            <h3>Created</h3>
            <div className="input-row">
              <label className="input-label">Created Date</label>
              <input
                type="date"
                className="input-box"
                value={answers.RelevantNotes.RelevantNotesValue}
                onChange={(e) => handleInputChange('RelevantNotes', 'RelevantNotesValue', e.target.value)}
              />
            </div>
            
            <div className="tab-actions">
              <button
                className={`btn ${savingSection === 'RelevantNotes' ? 'btn-secondary' : 'btn-success'}`}
                onClick={() => handleSave('RelevantNotes')}
                disabled={savingSection === 'RelevantNotes'}
              >
                {savingSection === 'RelevantNotes' ? 'Saving...' : 
                 savedSections.has('RelevantNotes') ? 'Saved ✓' : 'Save Section'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleReset('RelevantNotes')}
              >
                Reset Section
              </button>
            </div>
          </div>
        );

      case 'comments':
        return (
          <div className="accordion-content">
            <h3>Comments</h3>
            <div className="input-row">
              <label className="input-label">Comments</label>
              <textarea
                className="textarea-input"
                value={answers.Comments.CommentsValue}
                onChange={(e) => handleInputChange('Comments', 'CommentsValue', e.target.value)}
                rows="6"
              />
            </div>
            
            <div className="tab-actions">
              <button
                className={`btn ${savingSection === 'Comments' ? 'btn-secondary' : 'btn-success'}`}
                onClick={() => handleSave('Comments')}
                disabled={savingSection === 'Comments'}
              >
                {savingSection === 'Comments' ? 'Saving...' : 
                 savedSections.has('Comments') ? 'Saved ✓' : 'Save Section'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleReset('Comments')}
              >
                Reset Section
              </button>
            </div>
          </div>
        );

      case 'customfield':
        return (
          <div className="accordion-content">
            <h3>Risk/Mitigation</h3>
            <div className="input-row">
              <label className="input-label">Risk/Mitigation</label>
              <textarea
                className="textarea-input"
                value={answers.CustomField.CustomFieldValue}
                onChange={(e) => handleInputChange('CustomField', 'CustomFieldValue', e.target.value)}
                rows="6"
              />
            </div>
            
            <div className="tab-actions">
              <button
                className={`btn ${savingSection === 'CustomField' ? 'btn-secondary' : 'btn-success'}`}
                onClick={() => handleSave('CustomField')}
                disabled={savingSection === 'CustomField'}
              >
                {savingSection === 'CustomField' ? 'Saving...' : 
                 savedSections.has('CustomField') ? 'Saved ✓' : 'Save Section'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleReset('CustomField')}
              >
                Reset Section
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="risk-assessment-page">
      
      <div className="header">
        <button className="back-btn" onClick={() => navigate('/home')}>
          ← Back to Home
        </button>
        <h1>Risk Assessment</h1>
      </div>

      {/* Reset Notification */}
      {showResetNotification && (
        <div className="reset-notification">
          <div className="reset-message">
            <span className="reset-icon">🔄</span>
            <span>Form has been reset. You can start a new risk assessment!</span>
          </div>
        </div>
      )}

      {/* Excel Loaded Notification */}
      {showExcelLoadedNotification && (
        <div className="excel-loaded-notification">
          <div className="excel-loaded-message">
            <span className="excel-loaded-icon">📄</span>
            <span>Excel data loaded successfully!</span>
          </div>
        </div>
      )}

      {/* Risk Navigation */}
      <div className="risk-navigation">
        <div className="risk-selector">
          <label>Select Risk:</label>
          <select 
            value={currentRiskIndex} 
            onChange={(e) => switchToRisk(parseInt(e.target.value))}
            className="risk-dropdown"
          >
            {risks.map((risk, index) => (
              <option key={risk.id} value={index}>
                {risk.RiskID.RiskIDValue || `Risk ${index + 1}`}
              </option>
            ))}
          </select>
        </div>
        <div className="risk-actions">
          <button 
            className="add-risk-btn"
            onClick={addNewRisk}
            title="Add New Risk"
          >
            + Add New Risk
          </button>
          {risks.length > 1 && (
            <button 
              className="delete-risk-btn"
              onClick={deleteCurrentRisk}
              title="Delete Current Risk"
            >
              🗑️ Delete Risk
            </button>
          )}
          <div className="risk-counter">
            Risk {currentRiskIndex + 1} of {risks.length}
          </div>
        </div>
      </div>

      <div className={`accordion-section ${hasInteracted ? 'interacted' : ''}`}>
        <div className="left-buttons">
          <button
            className={`accordion-btn ${activeTab === 'riskid' ? 'active' : ''}`}
            onClick={() => handleTabClick('riskid')}
          >
            <span>Issue Key</span>
            {completedTabs.has('riskid') && <span>✓</span>}
          </button>
          
          <button
            className={`accordion-btn ${activeTab === 'description' ? 'active' : ''}`}
            onClick={() => handleTabClick('description')}
          >
            <span>Summary</span>
            {completedTabs.has('description') && <span>✓</span>}
          </button>
          
          <button
            className={`accordion-btn ${activeTab === 'severity' ? 'active' : ''}`}
            onClick={() => handleTabClick('severity')}
          >
            <span>Description</span>
            {completedTabs.has('severity') && <span>✓</span>}
          </button>
          
          <button
            className={`accordion-btn ${activeTab === 'priority' ? 'active' : ''}`}
            onClick={() => handleTabClick('priority')}
          >
            <span>Priority</span>
            {completedTabs.has('priority') && <span>✓</span>}
          </button>
          
          <button
            className={`accordion-btn ${activeTab === 'status' ? 'active' : ''}`}
            onClick={() => handleTabClick('status')}
          >
            <span>Status</span>
            {completedTabs.has('status') && <span>✓</span>}
          </button>
          
          <button
            className={`accordion-btn ${activeTab === 'owner' ? 'active' : ''}`}
            onClick={() => handleTabClick('owner')}
          >
            <span>Assignee</span>
            {completedTabs.has('owner') && <span>✓</span>}
          </button>
          
          <button
            className={`accordion-btn ${activeTab === 'date' ? 'active' : ''}`}
            onClick={() => handleTabClick('date')}
          >
            <span>Created</span>
            {completedTabs.has('date') && <span>✓</span>}
          </button>
          
          <button
            className={`accordion-btn ${activeTab === 'comments' ? 'active' : ''}`}
            onClick={() => handleTabClick('comments')}
          >
            <span>Comments</span>
            {completedTabs.has('comments') && <span>✓</span>}
          </button>
          
          <button
            className={`accordion-btn ${activeTab === 'customfield' ? 'active' : ''}`}
            onClick={() => handleTabClick('customfield')}
          >
            <span>Risk/Mitigation</span>
            {completedTabs.has('customfield') && <span>✓</span>}
          </button>
        </div>

        <div className="content-area">
          {renderContent()}
        </div>
      </div>

      {/* Success Animation Overlay */}
      {showSuccessAnimation && (
        <div className="success-overlay">
          <div className="success-message">
            <div className="success-icon">✓</div>
            <p>Section saved successfully!</p>
          </div>
        </div>
      )}

      {/* Full Page Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-ring-large"></div>
          <div className="loading-text">Generating Your Risk Assessment</div>
          <div className="loading-subtext">This may take a few moments...</div>
          
          {/* Progress Bar and Percentage */}
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${Math.min(loadingProgress, 100)}%` }}
              ></div>
            </div>
            <div className="progress-percentage">
              {Math.round(loadingProgress)}%
            </div>
            {loadingMessage && (
              <div className="loading-subtext" style={{ marginTop: '15px' }}>
                {loadingMessage}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Generate Assessment Button - Only show when all tabs are completed */}
      {(() => {
        const missingTabs = getMissingTabs();
        return missingTabs.length === 0;
      })() && (
        <div className="generate-plan-wrapper">
          <button
            className="generate-plan-btn"
            onClick={handleGenerateAssessment}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading-ring"></span>
                Generating...
              </>
            ) : 'Generate Risk Assessment'}
          </button>
        </div>
      )}
    </div>
  );
};

export default RiskAssessmentPage;
