import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './SprintPlanningPage.css';

const SprintPlanningPage = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  
  // Get user email once at component level
  const userEmail = user ? user.email : 'demo@example.com';

  // State management
  const [hasInteracted, setHasInteracted] = useState(false);
  const [activeTab, setActiveTab] = useState(null);
  const [savedData, setSavedData] = useState({});
  const [savedSections, setSavedSections] = useState(new Set()); // Track which sections are saved
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [savingSection, setSavingSection] = useState(null);

  const [answers, setAnswers] = useState({
    SprintOverview: {
      SprintNumber: '',
      SprintDates: '',
      SprintDuration: '',
      TeamName: '',
      SprintGoal: '',
    },
    TeamCapacity: {
      TotalHoursPerPerson: '',
      NumberOfMembers: '1',
      TeamMembers: [{
        id: Date.now(),
        roleName: '',
        workingHours: ''
      }],
      HistoricalStoryPoints: '',
    },
    ProductBacklog: {
      BacklogItems: [{
        id: Date.now(),
        userStorySummary: '',
        acceptanceCriteria: '',
        priority: 'Medium',
        effortEstimate: 0
      }]
    },
    DefinitionOfDone: {
      DoDContent: ''
    },
    RisksAndImpediments: {
      RisksContent: ''
    },
    AdditionalComments: {
      CommentsContent: ''
    }
  });

  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [collapsedItems, setCollapsedItems] = useState(new Set([0])); // Collapse the first item by default
  const [completedTabs, setCompletedTabs] = useState(new Set()); // Track completed tabs
  const [showResetNotification, setShowResetNotification] = useState(false);
  const [showExcelLoadedNotification, setShowExcelLoadedNotification] = useState(false);
  const [showDocxLoadedNotification, setShowDocxLoadedNotification] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Debug logging for initial state
  useEffect(() => {
    // Component mounted
  }, []);

  // Track showOptions changes
  useEffect(() => {
    // showOptions changed
  }, []);

  // Function to populate form with DOCX data (LLM-structured format)
  const populateFormWithDocxData = (docxData) => {
    console.log('DOCX data received (LLM format):', docxData);
    
    // Create a completely new answers object to force re-render
    const newAnswers = {
      SprintOverview: {
        SprintNumber: '',
        SprintDates: '',
        SprintDuration: '',
        TeamName: '',
        SprintGoal: '',
      },
      TeamCapacity: {
        TotalHoursPerPerson: '',
        NumberOfMembers: '1',
        TeamMembers: [{
          id: Date.now(),
          roleName: '',
          workingHours: ''
        }],
        HistoricalStoryPoints: '',
      },
      ProductBacklog: {
        BacklogItems: [{
          id: Date.now(),
          userStorySummary: '',
          acceptanceCriteria: '',
          priority: 'Medium',
          effortEstimate: 0
        }]
      },
      DefinitionOfDone: {
        DoDContent: ''
      },
      RisksAndImpediments: {
        RisksContent: ''
      },
      AdditionalComments: {
        CommentsContent: ''
      }
    };
    
    // Handle the new LLM-structured format
    if (docxData.sprintPlan) {
      const sprintPlan = docxData.sprintPlan;
      
      // Populate Sprint Overview
      if (sprintPlan.sprintOverview) {
        const overview = sprintPlan.sprintOverview;
        newAnswers.SprintOverview.SprintNumber = String(overview.sprintNumber || 'N/A');
        newAnswers.SprintOverview.SprintDates = String(overview.sprintDates || 'N/A');
        newAnswers.SprintOverview.SprintDuration = String(overview.sprintDuration || 'N/A');
        newAnswers.SprintOverview.TeamName = String(overview.teamName || 'N/A');
        newAnswers.SprintOverview.SprintGoal = String(overview.sprintGoal || 'N/A');
      }
      
      // Populate Team Capacity
      if (sprintPlan.teamCapacity) {
        const capacity = sprintPlan.teamCapacity;
        newAnswers.TeamCapacity.TotalHoursPerPerson = String(capacity.totalHoursPerPerson || 'N/A');
        newAnswers.TeamCapacity.HistoricalStoryPoints = String(capacity.historicalStoryPoints || 'N/A');
        
                 // Populate team members from structured array
         if (capacity.teamMembers && Array.isArray(capacity.teamMembers)) {
           const teamMembers = capacity.teamMembers.map((member, index) => ({
             id: Date.now() + index,
             roleName: String(member.name || member.role || 'N/A'), // Use name if available, fallback to role
             workingHours: member.workingHours ? `${String(member.workingHours)}h` : 'N/A'
           }));
           if (teamMembers.length > 0) {
             newAnswers.TeamCapacity.TeamMembers = teamMembers;
             newAnswers.TeamCapacity.NumberOfMembers = String(teamMembers.length);
           }
         }
      }
      
      // Populate Product Backlog
      if (sprintPlan.productBacklog && sprintPlan.productBacklog.backlogItems) {
        const backlogItems = sprintPlan.productBacklog.backlogItems.map((item, index) => ({
          id: Date.now() + index,
          userStorySummary: String(item.userStorySummary || 'N/A'),
          acceptanceCriteria: Array.isArray(item.acceptanceCriteria) 
            ? item.acceptanceCriteria.join('\n') 
            : String(item.acceptanceCriteria || 'N/A'),
          priority: String(item.priority || 'Low'),
          effortEstimate: Number(item.effortEstimateHours) || 0
        }));
        newAnswers.ProductBacklog.BacklogItems = backlogItems;
      }
      
      // Populate Definition of Done
      if (sprintPlan.definitionOfDone && Array.isArray(sprintPlan.definitionOfDone)) {
        const dodContent = sprintPlan.definitionOfDone.join('\n');
        newAnswers.DefinitionOfDone.DoDContent = dodContent || 'N/A';
      }
      
      // Populate Risks and Impediments
      if (sprintPlan.risksAndImpediments && Array.isArray(sprintPlan.risksAndImpediments)) {
        const risksContent = sprintPlan.risksAndImpediments.join('\n');
        newAnswers.RisksAndImpediments.RisksContent = risksContent || 'N/A';
      }
    } else {
      // Fallback to old format for backward compatibility
      console.log('Using fallback format for DOCX data');
      
      // Populate Sprint Overview
      if (docxData.sprint_overview) {
        const overview = docxData.sprint_overview;
        newAnswers.SprintOverview.SprintNumber = String(overview.SprintNumber || 'N/A');
        newAnswers.SprintOverview.SprintDates = String(overview.SprintDates || 'N/A');
        newAnswers.SprintOverview.SprintDuration = String(overview.SprintDuration || 'N/A');
        newAnswers.SprintOverview.TeamName = String(overview.TeamName || 'N/A');
        newAnswers.SprintOverview.SprintGoal = String(overview.SprintGoal || 'N/A');
      }
      
      // Populate Team Capacity
      if (docxData.team_capacity) {
        const capacity = docxData.team_capacity;
        newAnswers.TeamCapacity.TotalHoursPerPerson = String(capacity.TotalHoursPerPerson || 'N/A');
        
        // Parse team member details from text
        if (capacity.TeamMemberDetails) {
          const memberLines = capacity.TeamMemberDetails.split('\n').filter(line => line.trim());
          const teamMembers = memberLines.map((line, index) => {
            const parts = line.split(':');
            return {
              id: Date.now() + index,
              roleName: String(parts[0]?.trim() || 'N/A'),
              workingHours: String(parts[1]?.trim() || 'N/A')
            };
          });
          if (teamMembers.length > 0) {
            newAnswers.TeamCapacity.TeamMembers = teamMembers;
            newAnswers.TeamCapacity.NumberOfMembers = String(teamMembers.length);
          }
        }
      }
      
      // Populate Product Backlog
      if (docxData.product_backlog) {
        const backlog = docxData.product_backlog;
        if (backlog.BacklogItems && Array.isArray(backlog.BacklogItems)) {
          newAnswers.ProductBacklog.BacklogItems = backlog.BacklogItems;
        } else if (backlog.BacklogItems && typeof backlog.BacklogItems === 'string') {
          // If it's a string, convert to array format
          const items = backlog.BacklogItems.split('\n').filter(item => item.trim());
          newAnswers.ProductBacklog.BacklogItems = items.map((item, index) => ({
            id: Date.now() + index,
            userStorySummary: String(item.trim()),
            acceptanceCriteria: 'N/A',
            priority: 'Low',
            effortEstimate: 0
          }));
        }
      }
      
      // Populate Definition of Done
      if (docxData.definition_of_done) {
        const dod = docxData.definition_of_done;
        if (dod.DefinitionOfDone) {
          const dodContent = String(dod.DefinitionOfDone);
          newAnswers.DefinitionOfDone.DoDContent = dodContent || 'N/A';
        }
      }
      
      // Populate Risks and Impediments
      if (docxData.risks_and_impediments) {
        const risks = docxData.risks_and_impediments;
        if (risks.RisksAndImpediments) {
          const risksContent = String(risks.RisksAndImpediments);
          newAnswers.RisksAndImpediments.RisksContent = risksContent || 'N/A';
        }
      }
    }
    
    // Force a complete state update
    setAnswers(newAnswers);
    console.log('Form populated with DOCX data:', newAnswers);
    console.log('Sprint Overview data:', newAnswers.SprintOverview);
    console.log('Team Capacity data:', newAnswers.TeamCapacity);
    console.log('Product Backlog data:', newAnswers.ProductBacklog);
    
    // Show success notification
    console.log('DOCX data successfully loaded and form populated!');
    setShowDocxLoadedNotification(true);
    setTimeout(() => {
      setShowDocxLoadedNotification(false);
    }, 5000);
    
    // Force re-render by updating a timestamp
    setTimeout(() => {
      setAnswers(prev => ({ ...prev }));
    }, 100);
    
    // Set active tab to overview to show the populated data
    setActiveTab('overview');
  };

  // Load saved data on component mount
  useEffect(() => {
    // Check if a plan was generated in the previous session
    const planGenerated = localStorage.getItem('planGenerated');
    
    if (planGenerated === 'true') {
      // A plan was generated, start fresh
      localStorage.removeItem('planGenerated'); // Clear the flag
      localStorage.removeItem('sprintPlanningData'); // Clear saved data
      setCollapsedItems(new Set([0])); // Set default collapsed state
      setShowResetNotification(true); // Show notification
      // Hide notification after 3 seconds
      setTimeout(() => setShowResetNotification(false), 3000);
      return;
    }

    // Check for Excel data from upload
    const excelData = sessionStorage.getItem('excelSprintData');
    if (excelData) {
      try {
        const parsedData = JSON.parse(excelData);
        console.log('Excel data found, populating form:', parsedData);
        
        // Populate form fields with Excel data
        populateFormWithExcelData(parsedData);
        
        // Clear the Excel data from sessionStorage
        sessionStorage.removeItem('excelSprintData');
        
      } catch (error) {
        console.error('Error parsing Excel data:', error);
      }
    }

    // Check for DOCX data from upload
    const docxData = sessionStorage.getItem('docxSprintData');
    if (docxData) {
      try {
        const parsedData = JSON.parse(docxData);
        console.log('DOCX data found, populating form:', parsedData);
        console.log('DOCX data type:', typeof parsedData);
        console.log('DOCX data keys:', Object.keys(parsedData));
        
        // Populate form fields with DOCX data
        populateFormWithDocxData(parsedData);
        
        // Clear the DOCX data from sessionStorage
        sessionStorage.removeItem('docxSprintData');
        
      } catch (error) {
        console.error('Error parsing DOCX data:', error);
      }
    }

    // Load previously saved data from localStorage
    const savedData = localStorage.getItem('sprintPlanningData');
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
          setActiveTab('overview');
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
      // No saved data, start with overview tab
      setActiveTab('overview');
    }
  }, []);

  // Function to populate form with Excel data
  const populateFormWithExcelData = (excelData) => {
    console.log('Excel data received in populateFormWithExcelData:', excelData);
    console.log('Excel data structure:', JSON.stringify(excelData, null, 2));
    const newAnswers = { ...answers };
    
    // Populate Sprint Overview
    if (excelData.sprintOverview) {
      const overview = excelData.sprintOverview;
      newAnswers.SprintOverview.SprintNumber = overview.sprintNumber || 'N/A';
      newAnswers.SprintOverview.SprintDates = overview.sprintDates || 'N/A';
      newAnswers.SprintOverview.SprintDuration = overview.sprintDuration || 'N/A';
      newAnswers.SprintOverview.TeamName = overview.teamName || 'N/A';
      newAnswers.SprintOverview.SprintGoal = overview.sprintGoal || 'N/A';
    }
    
    // Populate Team Capacity
    if (excelData.teamCapacity) {
      const capacity = excelData.teamCapacity;
      newAnswers.TeamCapacity.TotalHoursPerPerson = capacity.totalHoursPerPerson || 'N/A';
      newAnswers.TeamCapacity.HistoricalStoryPoints = capacity.historicalStoryPoints || 'N/A';
      
      // Populate team members
      if (capacity.teamMembers && capacity.teamMembers.length > 0) {
        newAnswers.TeamCapacity.TeamMembers = capacity.teamMembers.map(member => ({
          id: Date.now() + Math.random(), // Ensure unique ID
          roleName: member.role || 'N/A',
          workingHours: member.workingHours || 'N/A'
        }));
      }
    }
    
    // Populate Product Backlog
    if (excelData.productBacklog && excelData.productBacklog.userStories) {
      newAnswers.ProductBacklog.BacklogItems = excelData.productBacklog.userStories.map(story => ({
        id: Date.now() + Math.random(), // Ensure unique ID
        userStorySummary: story.userStorySummary || 'N/A',
        acceptanceCriteria: story.acceptanceCriteria || 'N/A',
        priority: story.priority || 'Low',
        effortEstimate: parseInt(story.effortEstimate) || 0
      }));
    }
    
    // Populate Definition of Done
    if (excelData.definitionOfDone && excelData.definitionOfDone.definitionOfDone) {
      const dodContent = excelData.definitionOfDone.definitionOfDone.join('\n');
      newAnswers.DefinitionOfDone.DoDContent = dodContent || 'N/A';
    }
    
    // Populate Risks & Impediments
    if (excelData.risksImpediments && excelData.risksImpediments.risksImpediments) {
      const risksContent = excelData.risksImpediments.risksImpediments.join('\n');
      newAnswers.RisksAndImpediments.RisksContent = risksContent || 'N/A';
    }
    
    // Populate Additional Comments
    if (excelData.additionalComments && excelData.additionalComments.additionalComments) {
      newAnswers.AdditionalComments.CommentsContent = excelData.additionalComments.additionalComments || 'N/A';
    }
    
    setAnswers(newAnswers);
    
    // Mark all populated sections as saved
    const newSavedSections = new Set();
    Object.keys(excelData).forEach(key => {
      if (excelData[key] && Object.keys(excelData[key]).length > 0) {
        newSavedSections.add(key);
      }
    });
    setSavedSections(newSavedSections);
    
    // Show success notification
    setShowExcelLoadedNotification(true);
    setTimeout(() => setShowExcelLoadedNotification(false), 5000);
    
    // Set active tab to overview to show the populated data
    setActiveTab('overview');
    
    console.log('Form populated with Excel data:', newAnswers);
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

  const handleInputChange = (section, key, value) => {
    setAnswers(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const addTeamMember = () => {
    setAnswers(prev => ({
      ...prev,
      TeamCapacity: {
        ...prev.TeamCapacity,
        TeamMembers: [
          ...prev.TeamCapacity.TeamMembers,
          {
            id: Date.now(),
            roleName: '',
            workingHours: ''
          }
        ]
      }
    }));
    
    // Update NumberOfMembers to match the actual count
    const newCount = answers.TeamCapacity.TeamMembers.length + 1;
    setAnswers(prev => ({
      ...prev,
      TeamCapacity: {
        ...prev.TeamCapacity,
        NumberOfMembers: newCount.toString()
      }
    }));
  };

  const handleTeamMemberChange = (index, field, value) => {
    setAnswers(prev => ({
      ...prev,
      TeamCapacity: {
        ...prev.TeamCapacity,
        TeamMembers: prev.TeamCapacity.TeamMembers.map((member, i) =>
          i === index ? { ...member, [field]: value } : member
        )
      }
    }));
  };

  const removeTeamMember = (index) => {
    if (answers.TeamCapacity.TeamMembers.length > 1) {
      setAnswers(prev => ({
        ...prev,
        TeamCapacity: {
          ...prev.TeamCapacity,
          TeamMembers: prev.TeamCapacity.TeamMembers.filter((_, i) => i !== index)
        }
      }));
      
      // Update NumberOfMembers to match the actual count
      const newCount = answers.TeamCapacity.TeamMembers.length - 1;
      setAnswers(prev => ({
        ...prev,
        TeamCapacity: {
          ...prev.TeamCapacity,
          NumberOfMembers: newCount.toString()
        }
      }));
    }
  };

  const addBacklogItem = () => {
    setAnswers(prev => ({
      ...prev,
      ProductBacklog: {
        ...prev.ProductBacklog,
        BacklogItems: [
          ...prev.ProductBacklog.BacklogItems,
          {
            id: Date.now(),
            userStorySummary: '',
            acceptanceCriteria: '',
            priority: 'Medium',
            effortEstimate: 0
          }
        ]
      }
    }));
    
    // Auto-collapse the new item
    const newIndex = answers.ProductBacklog.BacklogItems.length;
    setCollapsedItems(prev => new Set([...prev, newIndex]));
  };

  const removeBacklogItem = (index) => {
    if (answers.ProductBacklog.BacklogItems.length > 1) {
      setAnswers(prev => ({
        ...prev,
        ProductBacklog: {
          ...prev.ProductBacklog,
          BacklogItems: prev.ProductBacklog.BacklogItems.filter((_, i) => i !== index)
        }
      }));
      
      // Remove from collapsed items
      setCollapsedItems(prev => {
        const newCollapsed = new Set(prev);
        newCollapsed.delete(index);
        // Adjust indices for items after the removed one
        const adjustedCollapsed = new Set();
        newCollapsed.forEach(i => {
          if (i < index) {
            adjustedCollapsed.add(i);
          } else {
            adjustedCollapsed.add(i - 1);
          }
        });
        return adjustedCollapsed;
      });
    }
  };

  const handleBacklogItemChange = (index, field, value) => {
    setAnswers(prev => ({
      ...prev,
      ProductBacklog: {
        ...prev.ProductBacklog,
        BacklogItems: prev.ProductBacklog.BacklogItems.map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        )
      }
    }));
  };

  const handleEffortChange = (index, increment) => {
    setAnswers(prev => ({
      ...prev,
      ProductBacklog: {
        ...prev.ProductBacklog,
        BacklogItems: prev.ProductBacklog.BacklogItems.map((item, i) =>
          i === index ? { ...item, effortEstimate: Math.max(0, item.effortEstimate + increment) } : item
        )
      }
    }));
  };

  const toggleBacklogItem = (index) => {
    setCollapsedItems(prev => {
      const newCollapsed = new Set(prev);
      if (newCollapsed.has(index)) {
        newCollapsed.delete(index);
      } else {
        newCollapsed.add(index);
      }
      return newCollapsed;
    });
  };

  const autoResizeTextarea = (element) => {
    element.style.height = 'auto';
    element.style.height = element.scrollHeight + 'px';
  };

  const handleTextareaChange = (index, field, value, event) => {
    handleBacklogItemChange(index, field, value);
    autoResizeTextarea(event.target);
  };

  const handleDoDChange = (value, event) => {
    handleInputChange('DefinitionOfDone', 'DoDContent', value);
    autoResizeTextarea(event.target);
  };

  const handleRisksChange = (value, event) => {
    handleInputChange('RisksAndImpediments', 'RisksContent', value);
    autoResizeTextarea(event.target);
  };

  const handleSave = async (section) => {
    setSavingSection(section);
    
    // Simulate save delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      // Save to localStorage
      const updatedData = { ...answers };
      localStorage.setItem('sprintPlanningData', JSON.stringify(updatedData));
      setSavedData(updatedData);
      
      // Update saved sections
      setSavedSections(prev => new Set([...prev, section]));
      
      // Update completion status
      if (isTabCompleted(getTabNameFromSection(section))) {
        setCompletedTabs(prev => new Set([...prev, getTabNameFromSection(section)]));
      }
      
      // Show success animation
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 2000);
      
    } catch (error) {
      console.error('Error saving data:', error);
    } finally {
      setSavingSection(null);
    }
  };

  const getTabNameFromSection = (section) => {
    const sectionMap = {
      'SprintOverview': 'overview',
      'TeamCapacity': 'capacity',
      'ProductBacklog': 'backlog',
      'DefinitionOfDone': 'dod',
      'RisksAndImpediments': 'risks'
    };
    return sectionMap[section] || section;
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
        const newSaved = new Set(prev);
        newSaved.delete(section);
        return newSaved;
      });
      
      // Update completion status
      setCompletedTabs(prev => {
        const newCompleted = new Set(prev);
        newCompleted.delete(getTabNameFromSection(section));
        return newCompleted;
      });
      
    } else {
      // Reset all data
      const defaultAnswers = {
        SprintOverview: {
          SprintNumber: '',
          SprintDates: '',
          SprintDuration: '',
          TeamName: '',
          SprintGoal: '',
        },
        TeamCapacity: {
          TotalHoursPerPerson: '',
          NumberOfMembers: '1',
          TeamMembers: [{
            id: Date.now(),
            roleName: '',
            workingHours: ''
          }],
          HistoricalStoryPoints: '',
        },
        ProductBacklog: {
          BacklogItems: [{
            id: Date.now(),
            userStorySummary: '',
            acceptanceCriteria: '',
            priority: 'Medium',
            effortEstimate: 0
          }]
        },
        DefinitionOfDone: {
          DoDContent: ''
        },
        RisksAndImpediments: {
          RisksContent: ''
        }
      };
      
      setAnswers(defaultAnswers);
      setSavedData({});
      setSavedSections(new Set());
      setCompletedTabs(new Set());
      setCollapsedItems(new Set([0]));
      setHasInteracted(false);
      setActiveTab(null);
      
      // Clear localStorage
      localStorage.removeItem('sprintPlanningData');
    }
  };

  const isTabCompleted = (tabName) => {
    const sectionMap = {
      'overview': 'SprintOverview',
      'capacity': 'TeamCapacity',
      'backlog': 'ProductBacklog',
      'dod': 'DefinitionOfDone',
      'risks': 'RisksAndImpediments',
      'comments': 'AdditionalComments'
    };
    
    const section = sectionMap[tabName];
    if (!section) return false;
    
    const sectionData = answers[section];
    if (!sectionData) return false;
    
    switch (tabName) {
      case 'overview':
        return sectionData.SprintNumber && sectionData.SprintDates && 
               sectionData.SprintDuration && sectionData.TeamName && sectionData.SprintGoal;
      
      case 'capacity':
        return sectionData.TotalHoursPerPerson && sectionData.HistoricalStoryPoints &&
               Array.isArray(sectionData.TeamMembers) && 
               sectionData.TeamMembers.every(member => member && member.roleName && member.workingHours);
      
      case 'backlog':
        return Array.isArray(sectionData.BacklogItems) && 
               sectionData.BacklogItems.every(item => 
                 item && item.userStorySummary && item.acceptanceCriteria && item.effortEstimate > 0
               );
      
      case 'dod':
        return sectionData.DoDContent && sectionData.DoDContent.trim().length > 0;
      
      case 'risks':
        return sectionData.RisksContent && sectionData.RisksContent.trim().length > 0;
      
      case 'comments':
        return sectionData.CommentsContent && sectionData.CommentsContent.trim().length > 0;
      
      default:
        return false;
    }
  };

  const getMissingTabs = () => {
      const allTabs = ['overview', 'capacity', 'backlog', 'dod', 'risks', 'comments'];
  const missingTabs = allTabs.filter(tab => !isTabCompleted(tab));
    
    const tabDisplayNames = {
      'overview': 'Sprint Overview',
      'capacity': 'Team Capacity',
      'backlog': 'Product Backlog',
      'dod': 'Definition of Done',
      'risks': 'Risks & Impediments',
      'comments': 'Additional Comments'
    };
    
    return missingTabs.map(tab => tabDisplayNames[tab]);
  };

  const getDefaultSectionData = (section) => {
    switch (section) {
      case 'SprintOverview':
        return {
          SprintNumber: '',
          SprintDates: '',
          SprintDuration: '',
          TeamName: '',
          SprintGoal: '',
        };
      case 'TeamCapacity':
        return {
          TotalHoursPerPerson: '',
          NumberOfMembers: '1',
          TeamMembers: [{
            id: Date.now(),
            roleName: '',
            workingHours: ''
          }],
          HistoricalStoryPoints: '',
        };
      case 'ProductBacklog':
        return {
          BacklogItems: [{
            id: Date.now(),
            userStorySummary: '',
            acceptanceCriteria: '',
            priority: 'Medium',
            effortEstimate: 0
          }]
        };
      case 'DefinitionOfDone':
        return { DoDContent: '' };
      case 'RisksAndImpediments':
        return { RisksContent: '' };
      case 'AdditionalComments':
        return { CommentsContent: '' };
      default:
        return {};
    }
  };

  const handleGeneratePlan = async () => {
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
      { progress: 15, message: "Analyzing sprint data..." },
      { progress: 35, message: "Processing team capacity..." },
      { progress: 55, message: "Evaluating backlog items..." },
      { progress: 75, message: "Generating AI response..." },
      { progress: 90, message: "Finalizing plan..." }
    ];
    
    let currentStage = 0;
    const progressInterval = setInterval(() => {
      if (currentStage < progressStages.length) {
        setLoadingProgress(progressStages[currentStage].progress);
        setLoadingMessage(progressStages[currentStage].message);
        currentStage++;
      }
    }, 800); // Move to next stage every 800ms
    
    try {
      const requestData = {
        sprint_overview: answers.SprintOverview,
        team_capacity: answers.TeamCapacity,
        product_backlog: answers.ProductBacklog,
        definition_of_done: answers.DefinitionOfDone,
        risks_and_impediments: answers.RisksAndImpediments,
        additional_comments: answers.AdditionalComments,
        sow_content: (sessionStorage.getItem('sowContentHtml') || sessionStorage.getItem('sowContentRaw')) || null,
        user_email: userEmail
      };

      // console.log('Sending data to backend:', JSON.stringify(requestData, null, 2));

      const response = await fetch('/api/sprint/generate-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // The backend already saves the sprint plan to database
      // console.log('Sprint plan generated successfully');

      // Set a flag indicating that a plan was successfully generated
      localStorage.setItem('planGenerated', 'true');

      // Keep SOW content in sessionStorage for results page
      // SOW content will be cleared when user navigates away from results

      // Reset the form after successful plan generation
      handleReset();

      // Debug logging
      // console.log('SprintPlanningPage - Navigation State:', {
      //   sprintPlan: result,
      //   originalData: requestData
      // });
      
      // Navigate to results page with the generated plan
      navigate('/sprint-results', { 
        state: { 
          sprintPlan: result,
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
      console.error('Error generating sprint plan:', error);
      alert('Error generating sprint plan. Please try again.');
    } finally {
      clearInterval(progressInterval);
      setLoadingProgress(100);
      setTimeout(() => {
        setLoading(false);
        setLoadingProgress(0);
      }, 500); // Show 100% for 500ms before hiding
    }
  };

  // Auto-resize textareas
  useEffect(() => {
    const textareas = document.querySelectorAll('.textarea-input');
    const timeouts = [];
    
    textareas.forEach(textarea => {
      const timeout = setTimeout(() => autoResizeTextarea(textarea), 10);
      timeouts.push(timeout);
    });
    
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [answers.ProductBacklog.BacklogItems]);

  useEffect(() => {
    if (!loading) {
      const textareas = document.querySelectorAll('.textarea-input');
      const timeouts = [];
      
      textareas.forEach(textarea => {
        const timeout = setTimeout(() => autoResizeTextarea(textarea), 50);
        timeouts.push(timeout);
      });
      
      return () => {
        timeouts.forEach(timeout => clearTimeout(timeout));
      };
    }
  }, [loading]);

  // Update completion status when answers change
  useEffect(() => {
    console.log('Answers state changed:', answers);
    const allTabs = ['overview', 'capacity', 'backlog', 'dod', 'risks', 'comments'];
    const newCompletedTabs = new Set();
    
    allTabs.forEach(tab => {
      if (isTabCompleted(tab)) {
        newCompletedTabs.add(tab);
      }
    });
    
    setCompletedTabs(newCompletedTabs);
  }, [answers]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderContent = () => {
    console.log('Rendering content with answers:', answers);
    console.log('Active tab:', activeTab);
    
    if (!activeTab) {
      return (
        <div className="welcome-content">
          <h2>Welcome to Sprint Planning</h2>
          <p>
            Plan your sprint effectively by filling out each section below. 
            Start with the Sprint Overview and work your way through each tab to create a comprehensive sprint plan.
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
          
          <div className="welcome-actions">
            <button 
              className="btn btn-primary" 
              onClick={() => handleTabClick('overview')}
            >
              Start Planning
            </button>
            {Object.keys(savedData).length > 0 && (
              <button 
                className="btn btn-secondary" 
                onClick={() => handleReset()}
              >
                Reset All Data
              </button>
            )}
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        console.log('Rendering Sprint Overview with values:', answers.SprintOverview);
        return (
          <div className="accordion-content">
            <h3>Sprint Overview</h3>
            <div className="input-row">
              <label className="input-label">Sprint Number</label>
              <input
                type="text"
                className="input-box"
                value={answers.SprintOverview.SprintNumber}
                onChange={(e) => handleInputChange('SprintOverview', 'SprintNumber', e.target.value)}
                placeholder="e.g., Sprint 1, Sprint 2.1"
              />
            </div>
            <div className="input-row">
              <label className="input-label">Sprint Dates</label>
              <input
                type="text"
                className="input-box"
                value={answers.SprintOverview.SprintDates}
                onChange={(e) => handleInputChange('SprintOverview', 'SprintDates', e.target.value)}
                placeholder="e.g., March 1-15, 2024"
              />
            </div>
            <div className="input-row">
              <label className="input-label">Sprint Duration</label>
              <input
                type="text"
                className="input-box"
                value={answers.SprintOverview.SprintDuration}
                onChange={(e) => handleInputChange('SprintOverview', 'SprintDuration', e.target.value)}
                placeholder="e.g., 2 weeks, 10 business days"
              />
            </div>
            <div className="input-row">
              <label className="input-label">Team Name</label>
              <input
                type="text"
                className="input-box"
                value={answers.SprintOverview.TeamName}
                onChange={(e) => handleInputChange('SprintOverview', 'TeamName', e.target.value)}
                placeholder="e.g., Alpha Team, Development Squad"
              />
            </div>
            <div className="input-row">
              <label className="input-label">Sprint Goal</label>
              <textarea
                className="textarea-input"
                value={answers.SprintOverview.SprintGoal}
                onChange={(e) => handleInputChange('SprintOverview', 'SprintGoal', e.target.value)}
                placeholder="Describe the main objective and expected outcomes of this sprint..."
                rows="4"
              />
            </div>
            <div className="tab-actions">
              <button
                className={`btn ${savingSection === 'SprintOverview' ? 'btn-secondary' : 'btn-success'}`}
                onClick={() => handleSave('SprintOverview')}
                disabled={savingSection === 'SprintOverview'}
              >
                {savingSection === 'SprintOverview' ? 'Saving...' : 
                 savedSections.has('SprintOverview') ? 'Saved ✓' : 'Save Section'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleReset('SprintOverview')}
              >
                Reset Section
              </button>
            </div>
          </div>
        );

      case 'capacity':
        return (
          <div className="accordion-content">
            <h3>Team Capacity</h3>
            <div className="input-row">
              <label className="input-label">Total Hours Per Person</label>
              <input
                type="text"
                className="input-box"
                value={answers.TeamCapacity.TotalHoursPerPerson}
                onChange={(e) => handleInputChange('TeamCapacity', 'TotalHoursPerPerson', e.target.value)}
                placeholder="e.g., 40 hours, 32 hours"
              />
            </div>
            
            <div className="team-members-table">
              <div className="team-members-header">
                <h3>Team Members</h3>
                <button className="add-member-btn" onClick={addTeamMember}>
                  + Add Member
                </button>
              </div>
              
              <div className="table-header">
                <div className="header-cell">#</div>
                <div className="header-cell">Role</div>
                <div className="header-cell">Working Hours</div>
                <div className="header-cell">Actions</div>
              </div>
              
              {answers.TeamCapacity.TeamMembers.map((member, index) => (
                <div key={member.id} className="table-row">
                  <div className="table-cell">
                    <div className="row-number">{index + 1}</div>
                  </div>
                  <div className="table-cell">
                    <input
                      type="text"
                      className="table-input"
                      value={member.roleName}
                      onChange={(e) => handleTeamMemberChange(index, 'roleName', e.target.value)}
                      placeholder="e.g., Developer, Designer, QA"
                    />
                  </div>
                  <div className="table-cell">
                    <input
                      type="text"
                      className="table-input"
                      value={member.workingHours}
                      onChange={(e) => handleTeamMemberChange(index, 'workingHours', e.target.value)}
                      placeholder="e.g., 40h, 32h, 20h"
                    />
                  </div>
                  <div className="table-cell actions-cell">
                    {answers.TeamCapacity.TeamMembers.length > 1 && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => removeTeamMember(index)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="input-row">
              <label className="input-label">Historical Story Points</label>
              <input
                type="text"
                className="input-box"
                value={answers.TeamCapacity.HistoricalStoryPoints}
                onChange={(e) => handleInputChange('TeamCapacity', 'HistoricalStoryPoints', e.target.value)}
                placeholder="e.g., 25 story points per sprint, 15-20 points"
              />
            </div>
            
            <div className="tab-actions">
              <button
                className={`btn ${savingSection === 'TeamCapacity' ? 'btn-secondary' : 'btn-success'}`}
                onClick={() => handleSave('TeamCapacity')}
                disabled={savingSection === 'TeamCapacity'}
              >
                {savingSection === 'TeamCapacity' ? 'Saving...' : 
                 savedSections.has('TeamCapacity') ? 'Saved ✓' : 'Save Section'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleReset('TeamCapacity')}
              >
                Reset Section
              </button>
            </div>
          </div>
        );

      case 'backlog':
        return (
          <div className="accordion-content">
            <h3>Product Backlog</h3>
            <div className="backlog-section">
              <div className="backlog-header">
                <h3>Backlog Items</h3>
                <button className="add-member-btn" onClick={addBacklogItem}>
                  + Add Item
                </button>
              </div>
              
              {answers.ProductBacklog.BacklogItems.length === 0 ? (
                <div className="empty-backlog">
                  <p>No backlog items yet. Add your first item to get started!</p>
                </div>
              ) : (
                answers.ProductBacklog.BacklogItems.map((item, index) => (
                  <div key={item.id} className="backlog-item">
                    <div 
                      className="backlog-item-header"
                      onClick={() => toggleBacklogItem(index)}
                    >
                      <h4>
                        <span className="collapse-icon">
                          {collapsedItems.has(index) ? '▶' : '▼'}
                        </span>
                        Backlog Item {index + 1}
                      </h4>
                    </div>
                    
                    <div className={`backlog-fields ${collapsedItems.has(index) ? 'collapsed' : ''}`}>
                      <div className="input-row story-summary">
                        <label className="input-label">User Story Summary</label>
                        <textarea
                          className="textarea-input"
                          value={item.userStorySummary}
                          onChange={(e) => handleTextareaChange(index, 'userStorySummary', e.target.value, e)}
                          placeholder="As a [user], I want [feature] so that [benefit]..."
                          rows="3"
                        />
                      </div>
                      
                      <div className="input-row acceptance-criteria">
                        <label className="input-label">Acceptance Criteria</label>
                        <textarea
                          className="textarea-input"
                          value={item.acceptanceCriteria}
                          onChange={(e) => handleTextareaChange(index, 'acceptanceCriteria', e.target.value, e)}
                          placeholder="List the acceptance criteria for this user story..."
                          rows="4"
                        />
                      </div>
                      
                      <div className="input-row">
                        <label className="input-label">Priority</label>
                        <select
                          className="input-box"
                          value={item.priority}
                          onChange={(e) => handleBacklogItemChange(index, 'priority', e.target.value)}
                        >
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </div>
                      
                      <div className="input-row">
                        <label className="input-label">Effort Estimate (Story Points)</label>
                        <div className="effort-input-group">
                          <button
                            className="effort-btn"
                            onClick={() => handleEffortChange(index, -1)}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            className="effort-input"
                            value={item.effortEstimate}
                            onChange={(e) => handleBacklogItemChange(index, 'effortEstimate', parseInt(e.target.value) || 0)}
                            min="0"
                          />
                          <button
                            className="effort-btn"
                            onClick={() => handleEffortChange(index, 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      
                      {answers.ProductBacklog.BacklogItems.length > 1 && (
                        <div className="add-another-wrapper">
                          <button
                            className="btn btn-danger"
                            onClick={() => removeBacklogItem(index)}
                          >
                            Remove Item
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="tab-actions">
              <button
                className={`btn ${savingSection === 'ProductBacklog' ? 'btn-secondary' : 'btn-success'}`}
                onClick={() => handleSave('ProductBacklog')}
                disabled={savingSection === 'ProductBacklog'}
              >
                {savingSection === 'ProductBacklog' ? 'Saving...' : 
                 savedSections.has('ProductBacklog') ? 'Saved ✓' : 'Save Section'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleReset('ProductBacklog')}
              >
                Reset Section
              </button>
            </div>
          </div>
        );

      case 'dod':
        return (
          <div className="accordion-content">
            <h3>Definition of Done</h3>
            <div className="input-row">
              <label className="input-label">Definition of Done Criteria</label>
              <textarea
                className="textarea-input dod-textarea"
                value={answers.DefinitionOfDone.DoDContent}
                onChange={(e) => handleDoDChange(e.target.value, e)}
                placeholder="Define the criteria that must be met for a user story to be considered 'done'..."
                rows="8"
              />
            </div>
            
            <div className="tab-actions">
              <button
                className={`btn ${savingSection === 'DefinitionOfDone' ? 'btn-secondary' : 'btn-success'}`}
                onClick={() => handleSave('DefinitionOfDone')}
                disabled={savingSection === 'DefinitionOfDone'}
              >
                {savingSection === 'DefinitionOfDone' ? 'Saving...' : 
                 savedSections.has('DefinitionOfDone') ? 'Saved ✓' : 'Save Section'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleReset('DefinitionOfDone')}
              >
                Reset Section
              </button>
            </div>
          </div>
        );

      case 'risks':
        return (
          <div className="accordion-content">
            <h3>Risks & Impediments</h3>
            <div className="input-row">
              <label className="input-label">Risks and Impediments</label>
              <textarea
                className="textarea-input risks-textarea"
                value={answers.RisksAndImpediments.RisksContent}
                onChange={(e) => handleRisksChange(e.target.value, e)}
                placeholder="Identify potential risks, impediments, and mitigation strategies for this sprint..."
                rows="8"
              />
            </div>
            
            <div className="tab-actions">
              <button
                className={`btn ${savingSection === 'RisksAndImpediments' ? 'btn-secondary' : 'btn-success'}`}
                onClick={() => handleSave('RisksAndImpediments')}
                disabled={savingSection === 'RisksAndImpediments'}
              >
                {savingSection === 'RisksAndImpediments' ? 'Saving...' : 
                 savedSections.has('RisksAndImpediments') ? 'Saved ✓' : 'Save Section'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleReset('RisksAndImpediments')}
              >
                Reset Section
              </button>
            </div>
          </div>
        );

      case 'comments':
        return (
          <div className="accordion-content">
            <h3>Additional Comments</h3>
            <div className="input-row">
              <label className="input-label">Additional Comments</label>
              <textarea
                className="textarea-input comments-textarea"
                value={answers.AdditionalComments.CommentsContent}
                onChange={(e) => handleInputChange('AdditionalComments', 'CommentsContent', e.target.value)}
                placeholder="Add any additional comments, notes, or special considerations for this sprint..."
                rows="8"
              />
            </div>
            
            <div className="tab-actions">
              <button
                className={`btn ${savingSection === 'AdditionalComments' ? 'btn-secondary' : 'btn-success'}`}
                onClick={() => handleSave('AdditionalComments')}
                disabled={savingSection === 'AdditionalComments'}
              >
                {savingSection === 'AdditionalComments' ? 'Saving...' : 
                 savedSections.has('AdditionalComments') ? 'Saved ✓' : 'Save Section'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleReset('AdditionalComments')}
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
    <div className="sprint-planning-page">
      
      <div className="header">
        <button className="back-btn" onClick={() => navigate('/home')}>
          ← Back to Home
        </button>
        <h1>Sprint Planning</h1>
      </div>

      {/* Reset Notification */}
      {showResetNotification && (
        <div className="reset-notification">
          <div className="reset-message">
            <span className="reset-icon">🔄</span>
            <span>Form has been reset. You can start planning a new sprint!</span>
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

      {/* DOCX Loaded Notification */}
      {showDocxLoadedNotification && (
        <div className="docx-loaded-notification">
          <div className="docx-loaded-message">
            <span className="docx-loaded-icon">📄</span>
            <span>DOCX data loaded successfully!</span>
          </div>
        </div>
      )}

      <div className={`accordion-section ${hasInteracted ? 'interacted' : ''}`}>
        <div className="left-buttons">
          <button
            className={`accordion-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => handleTabClick('overview')}
          >
            <span>Sprint Overview</span>
            {completedTabs.has('overview') && <span>✓</span>}
          </button>
          
          <button
            className={`accordion-btn ${activeTab === 'capacity' ? 'active' : ''}`}
            onClick={() => handleTabClick('capacity')}
          >
            <span>Team Capacity</span>
            {completedTabs.has('capacity') && <span>✓</span>}
          </button>
          
          <button
            className={`accordion-btn ${activeTab === 'backlog' ? 'active' : ''}`}
            onClick={() => handleTabClick('backlog')}
          >
            <span>Product Backlog</span>
            {completedTabs.has('backlog') && <span>✓</span>}
          </button>
          
          <button
            className={`accordion-btn ${activeTab === 'dod' ? 'active' : ''}`}
            onClick={() => handleTabClick('dod')}
          >
            <span>Definition of Done</span>
            {completedTabs.has('dod') && <span>✓</span>}
          </button>
          
          <button
            className={`accordion-btn ${activeTab === 'risks' ? 'active' : ''}`}
            onClick={() => handleTabClick('risks')}
          >
            <span>Risks & Impediments</span>
            {completedTabs.has('risks') && <span>✓</span>}
          </button>
          
          <button
            className={`accordion-btn ${activeTab === 'comments' ? 'active' : ''}`}
            onClick={() => handleTabClick('comments')}
          >
            <span>Additional Comments</span>
            {completedTabs.has('comments') && <span>✓</span>}
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
          <div className="loading-text">Generating Your Sprint Plan</div>
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

      {/* Generate Plan Button - Only show when all tabs are completed */}
      {completedTabs.size === 6 && (
        <div className="generate-plan-wrapper">
          <button
            className="generate-plan-btn"
            onClick={handleGeneratePlan}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading-ring"></span>
                Generating...
              </>
            ) : 'Generate Sprint Plan'}
          </button>
        </div>
      )}
    </div>
  );
};

export default SprintPlanningPage;