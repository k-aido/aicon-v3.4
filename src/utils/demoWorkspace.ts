/**
 * Demo workspace configuration
 * This provides a hardcoded workspace ID for testing persistence
 * without requiring full authentication flow
 */

// Hardcoded demo workspace ID (UUID v4)
export const DEMO_WORKSPACE_ID = '550e8400-e29b-41d4-a716-446655440001';

// Hardcoded demo user ID (UUID v4)
export const DEMO_USER_ID = '550e8400-e29b-41d4-a716-446655440002';

// Demo workspace configuration
export const DEMO_WORKSPACE_CONFIG = {
  id: DEMO_WORKSPACE_ID,
  user_id: DEMO_USER_ID,
  title: 'Demo Canvas Workspace',
  description: 'A demo workspace for testing canvas persistence',
  viewport: {
    x: 0,
    y: 0,
    zoom: 1.0
  },
  settings: {
    autoSave: true,
    autoSaveInterval: 5000, // 5 seconds
    showGrid: true,
    snapToGrid: false,
    gridSize: 20
  }
};

/**
 * Check if we're in demo mode
 * You can toggle this based on environment variables or URL params
 */
export const isDemoMode = () => {
  // Check URL params
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('demo') === 'true';
  }
  return false;
};

/**
 * Get the current workspace ID
 * Returns demo ID in demo mode, otherwise checks URL or returns null
 */
export const getCurrentWorkspaceId = (): string | null => {
  if (isDemoMode()) {
    return DEMO_WORKSPACE_ID;
  }
  
  // Check URL params for workspace ID
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const workspaceId = urlParams.get('workspace');
    if (workspaceId) {
      return workspaceId;
    }
  }
  
  return null;
};

/**
 * Get the current user ID
 * Returns demo ID in demo mode, otherwise returns null
 * In production, this would come from auth context
 */
export const getCurrentUserId = (): string | null => {
  if (isDemoMode()) {
    return DEMO_USER_ID;
  }
  
  // In production, get from auth context
  // For now, return null
  return null;
};