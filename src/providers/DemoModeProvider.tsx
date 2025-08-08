'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { isDemoMode, getDemoUserId, getDemoAccountId } from '@/config/demoMode';

interface DemoModeContextType {
  isDemoMode: boolean;
  demoUserId: string;
  demoAccountId: string;
  isDemoLoading: boolean;
}

const DemoModeContext = createContext<DemoModeContextType>({
  isDemoMode: false,
  demoUserId: '',
  demoAccountId: '',
  isDemoLoading: false
});

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DemoModeContextType>({
    isDemoMode: false,
    demoUserId: '',
    demoAccountId: '',
    isDemoLoading: true
  });

  useEffect(() => {
    // Check demo mode on client
    const isDemo = isDemoMode();
    setState({
      isDemoMode: isDemo,
      demoUserId: getDemoUserId(),
      demoAccountId: getDemoAccountId(),
      isDemoLoading: false
    });

    // Show demo mode banner
    if (isDemo && typeof window !== 'undefined') {
      console.log('%c🎮 DEMO MODE ACTIVE', 'background: #4F46E5; color: white; padding: 4px 8px; border-radius: 4px;');
      console.log('Demo Account ID:', getDemoAccountId());
      console.log('Demo User ID:', getDemoUserId());
    }
  }, []);

  return (
    <DemoModeContext.Provider value={state}>
      {children}
      {state.isDemoMode && !state.isDemoLoading && (
        <div className="fixed bottom-4 right-4 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">
          🎮 Demo Mode
        </div>
      )}
    </DemoModeContext.Provider>
  );
}

export function useDemoModeContext() {
  return useContext(DemoModeContext);
}