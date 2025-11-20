import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './WorkspaceDialog.css';

const WorkspaceDialog = ({ isOpen, onClose, onWorkspaceSelected }) => {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState(null);

  // Check if current user is admin
  const isAdmin = () => {
    const ADMIN_EMAILS = [
      "shaik.sharuk@forsysinc.com"
      // Add more admin emails here as needed
    ];
    return user && user.email && ADMIN_EMAILS.includes(user.email);
  };

  // Check if current user can delete workspace (admin or creator)
  const canDeleteWorkspace = (workspace) => {
    if (workspace.is_default) return false; // Default workspace cannot be deleted
    if (isAdmin()) return true; // Admin can delete any workspace
    if (user && user.email && workspace.created_by === user.email) return true; // Creator can delete their own workspace
    return false; // Others cannot delete
  };

  useEffect(() => {
    if (isOpen) {
      loadWorkspaces();
      // Prevent body scroll when modal is open
      document.body.classList.add('modal-open');
    } else {
      // Re-enable body scroll when modal is closed
      document.body.classList.remove('modal-open');
    }

    // Cleanup on component unmount
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  const loadWorkspaces = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/workspaces`);
      
      if (response.data.success) {
        setWorkspaces(response.data.workspaces);
        // Set the first workspace as default selection
        if (response.data.workspaces.length > 0) {
          setWorkspace(response.data.workspaces[0]);
        }
      } else {
        console.error('Failed to load workspaces:', response.data.message);
      }
    } catch (error) {
      console.error('Error loading workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const createWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;

    setCreating(true);
    try {
      const formData = new FormData();
      formData.append('name', newWorkspaceName.trim());
      if (newWorkspaceDescription.trim()) {
        formData.append('description', newWorkspaceDescription.trim());
      }

      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/workspaces`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        // Reload workspaces list
        await loadWorkspaces();
        setNewWorkspaceName('');
        setNewWorkspaceDescription('');
        setShowCreateForm(false);
        // No alert - just silently create and return to workspace list
      } else {
        alert(response.data.message || 'Failed to create workspace');
      }
    } catch (error) {
      console.error('Error creating workspace:', error);
      alert('Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  const deleteWorkspace = async (workspaceId, workspaceName) => {
    setWorkspaceToDelete({ id: workspaceId, name: workspaceName });
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!workspaceToDelete) return;

    setDeleting(true);
    try {
      const response = await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/workspaces/${workspaceToDelete.id}`,
        {
          params: {
            user_email: user?.email
          }
        }
      );

      if (response.data.success) {
        // Reload workspaces list
        await loadWorkspaces();
        // Clear selected workspace if it was deleted
        if (workspace && workspace.id === workspaceToDelete.id) {
          setWorkspace(null);
        }
      } else {
        alert(response.data.message || 'Failed to delete workspace');
      }
    } catch (error) {
      console.error('Error deleting workspace:', error);
      alert('Failed to delete workspace');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setWorkspaceToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setWorkspaceToDelete(null);
  };

  const handleWorkspaceSelect = (selectedWorkspace) => {
    setWorkspace(selectedWorkspace);
  };

  const handleSubmit = () => {
    if (workspace) {
      onWorkspaceSelected(workspace);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="workspace-dialog-overlay">
      <div className="workspace-dialog">
        <div className="workspace-dialog-header">
          <div className="workspace-dialog-title">
            <h2>Select Your Workspace</h2>
            <p>Please select a workspace to continue.</p>
          </div>
          <button 
            className="workspace-dialog-close" 
            onClick={onClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>

        <div className="workspace-dialog-content">
          {!showCreateForm ? (
            <>
              {loading ? (
                <div className="loading">Loading workspaces...</div>
              ) : workspaces.length > 0 ? (
                <div className="workspace-selection">
                  {workspaces.map((ws) => (
                    <div
                      key={ws.id}
                      className={`workspace-item ${workspace && workspace.id === ws.id ? 'selected' : ''}`}
                      onClick={() => handleWorkspaceSelect(ws)}
                    >
                      <div className="workspace-top">
                        <h3>{ws.name}</h3>
                      </div>
                      <div className="workspace-separator"></div>
                      <div className="workspace-middle">
                        <p className="workspace-description">{ws.description}</p>
                      </div>
                      <div className="workspace-bottom">
                        <div className="workspace-bottom-left">
                        </div>
                        <div className="workspace-bottom-center">
                          {ws.is_default && (
                            <span className="default-badge">Default</span>
                          )}
                          {canDeleteWorkspace(ws) && (
                            <button
                              className="delete-workspace-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteWorkspace(ws.id, ws.name);
                              }}
                              disabled={deleting}
                              title={isAdmin() ? "Delete workspace (Admin)" : "Delete workspace (Creator)"}
                            >
                              🗑️
                            </button>
                          )}
                          {!canDeleteWorkspace(ws) && !ws.is_default && (
                            <span className="no-permission-indicator" title="Only creator or admin can delete workspaces">
                              🔒
                            </span>
                          )}
                        </div>
                        <div className="workspace-bottom-right"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="error">No workspaces available</div>
              )}
            </>
          ) : (
            <div className="create-workspace-form">
              <h3>Create New Workspace</h3>
              <div className="form-group">
                <label htmlFor="workspaceName">Workspace Name *</label>
                <input
                  type="text"
                  id="workspaceName"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="Enter workspace name"
                  required
                  disabled={creating}
                />
              </div>
              <div className="form-group">
                <label htmlFor="workspaceDescription">Description (Optional)</label>
                <textarea
                  id="workspaceDescription"
                  value={newWorkspaceDescription}
                  onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                  placeholder="Enter workspace description"
                  rows={3}
                  disabled={creating}
                />
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewWorkspaceName('');
                    setNewWorkspaceDescription('');
                  }}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={createWorkspace}
                  disabled={creating || !newWorkspaceName.trim()}
                >
                  {creating ? 'Creating...' : 'Create Workspace'}
                </button>
              </div>
            </div>
          )}
        </div>

        {!showCreateForm && (
          <div className="workspace-dialog-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowCreateForm(true)}
            >
              Create New Workspace
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={!workspace || loading}
            >
              Continue with {workspace?.name || 'Workspace'}
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="delete-confirm-overlay">
          <div className="delete-confirm-dialog">
            <div className="delete-confirm-header">
              <h3>Delete Workspace</h3>
            </div>
            <div className="delete-confirm-content">
              <p>
                Are you sure you want to delete the workspace <strong>"{workspaceToDelete?.name}"</strong>?
              </p>
              <p className="warning-text">This action cannot be undone.</p>
            </div>
            <div className="delete-confirm-actions">
              <button
                className="btn btn-secondary"
                onClick={cancelDelete}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceDialog;
