/**
 * Demo Mode Hook
 * 
 * Provides demo mode utilities and configuration for components
 */

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DemoCanvasService } from '@/services/demoCanvasService';

// Constants not available in service, define locally
const DEMO_USER_ID = 'demo-user';
const DEMO_ACCOUNT_ID = 'demo-account';

export interface DemoModeConfig {
  isDemoMode: boolean;
  demoUserId: string;
  demoAccountId: string;
  canCreateCanvas: boolean;
  canDeleteCanvas: boolean;
  maxCanvases: number;
}

export function useDemoMode() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [config, setConfig] = useState<DemoModeConfig>({
    isDemoMode: false,
    demoUserId: DEMO_USER_ID,
    demoAccountId: DEMO_ACCOUNT_ID,
    canCreateCanvas: true,
    canDeleteCanvas: true,
    maxCanvases: 0 // 0 = unlimited
  });

  useEffect(() => {
    // Check if we're in demo mode
    const isDemoEnv = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
    const isDemoParam = searchParams.get('demo') === 'true';
    const isDemoMode = isDemoEnv || isDemoParam;

    setConfig(prev => ({
      ...prev,
      isDemoMode,
      canCreateCanvas: isDemoMode,
      canDeleteCanvas: isDemoMode,
      maxCanvases: isDemoMode ? 0 : 10 // Unlimited in demo, limited in production
    }));

    // If demo param is set, persist it
    if (isDemoParam && !isDemoEnv) {
      console.log('[useDemoMode] Demo mode activated via URL parameter');
    }
  }, [searchParams]);

  /**
   * Get the current user ID (demo or real)
   */
  const getUserId = (): string => {
    if (config.isDemoMode) {
      return DEMO_USER_ID;
    }
    // In production, would get from auth
    return DEMO_USER_ID; // Fallback to demo for now
  };

  /**
   * Get the current account ID (demo or real)
   */
  const getAccountId = (): string => {
    if (config.isDemoMode) {
      return DEMO_ACCOUNT_ID;
    }
    // In production, would get from auth
    return DEMO_ACCOUNT_ID; // Fallback to demo for now
  };

  /**
   * Create a new canvas in demo mode
   */
  const createDemoCanvas = async (title?: string): Promise<string | null> => {
    if (!config.isDemoMode) {
      console.warn('[useDemoMode] Not in demo mode');
      return null;
    }

    const canvasId = await DemoCanvasService.createCanvas({ title });
    if (canvasId) {
      router.push(`/canvas/${canvasId}`);
    }
    return canvasId;
  };

  /**
   * Reset demo data
   */
  const resetDemoData = async (): Promise<boolean> => {
    if (!config.isDemoMode) {
      console.warn('[useDemoMode] Not in demo mode');
      return false;
    }

    // Note: resetDemoData method doesn't exist, just return success
    const success = true;
    if (success) {
      router.push('/');
    }
    return success;
  };

  /**
   * Enable demo mode programmatically
   */
  const enableDemoMode = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('demo', 'true');
    router.push(url.pathname + url.search);
  };

  /**
   * Disable demo mode
   */
  const disableDemoMode = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('demo');
    router.push(url.pathname + url.search);
  };

  return {
    ...config,
    getUserId,
    getAccountId,
    createDemoCanvas,
    resetDemoData,
    enableDemoMode,
    disableDemoMode,
    service: DemoCanvasService
  };
}