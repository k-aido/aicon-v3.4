/**
 * Demo Mode Configuration
 * 
 * Central configuration for demo mode settings and feature flags
 */

export const demoModeConfig = {
  // Demo IDs
  accounts: {
    demoAccountId: '550e8400-e29b-41d4-a716-446655440001',
    demoUserId: '550e8400-e29b-41d4-a716-446655440002',
    mainDemoProjectId: '550e8400-e29b-41d4-a716-446655440003'
  },

  // Feature Flags
  features: {
    enableAuth: process.env.NEXT_PUBLIC_ENABLE_AUTH !== 'false',
    enableRLS: process.env.NEXT_PUBLIC_ENABLE_RLS !== 'false',
    enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== 'false',
    enableErrorTracking: process.env.NEXT_PUBLIC_ENABLE_ERROR_TRACKING !== 'false',
    debugMode: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true'
  },

  // Demo Limits
  limits: {
    maxCanvases: parseInt(process.env.NEXT_PUBLIC_MAX_CANVASES || '0', 10), // 0 = unlimited
    maxElementsPerCanvas: parseInt(process.env.NEXT_PUBLIC_MAX_ELEMENTS_PER_CANVAS || '0', 10),
    maxFileSize: parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '0', 10),
    autoSaveInterval: parseInt(process.env.NEXT_PUBLIC_AUTO_SAVE_INTERVAL || '2000', 10)
  },

  // Canvas Defaults
  canvasDefaults: {
    viewport: { x: 0, y: 0, zoom: 1.0 },
    settings: {
      gridSize: 20,
      snapToGrid: false,
      showGrid: true,
      autoSave: true,
      theme: 'dark'
    }
  },

  // Demo Content
  demoContent: {
    welcomeElement: {
      id: 1,
      type: 'content' as const,
      x: 100,
      y: 100,
      width: 300,
      height: 200,
      title: 'Welcome to AICON Demo',
      url: 'https://example.com/demo',
      platform: 'youtube' as const,
      thumbnail: '/demo-thumbnail.jpg'
    },
    sampleChat: {
      id: 2,
      type: 'chat' as const,
      x: 450,
      y: 100,
      width: 400,
      height: 500,
      title: 'AI Assistant',
      messages: [],
      model: 'gpt-4'
    }
  }
};

/**
 * Check if demo mode is enabled
 */
export function isDemoMode(): boolean {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  }
  
  return (
    process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
    new URLSearchParams(window.location.search).get('demo') === 'true' ||
    window.location.hostname === 'localhost'
  );
}

/**
 * Get demo mode user ID
 */
export function getDemoUserId(): string {
  return isDemoMode() ? demoModeConfig.accounts.demoUserId : '';
}

/**
 * Get demo mode account ID
 */
export function getDemoAccountId(): string {
  return isDemoMode() ? demoModeConfig.accounts.demoAccountId : '';
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof demoModeConfig.features): boolean {
  if (isDemoMode()) {
    // In demo mode, disable auth and RLS by default
    if (feature === 'enableAuth' || feature === 'enableRLS') {
      return false;
    }
  }
  return demoModeConfig.features[feature];
}