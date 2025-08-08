'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { checkEnvironmentVariables } from '@/utils/envCheck';
import Link from 'next/link';

export function EnvChecker() {
  const [envCheck, setEnvCheck] = useState<ReturnType<typeof checkEnvironmentVariables> | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Only run on client side
    setIsClient(true);
    
    // Check if already dismissed in this session
    const dismissedInSession = sessionStorage.getItem('env-check-dismissed');
    if (dismissedInSession === 'true') {
      setDismissed(true);
      return;
    }

    // Check environment
    const result = checkEnvironmentVariables();
    setEnvCheck(result);

    // Log to console for developers
    if (!result.valid) {
      console.group('🚨 AICON Environment Configuration Required');
      console.error('Missing environment variables detected!');
      console.log('Please visit /setup to configure your environment');
      console.groupEnd();
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('env-check-dismissed', 'true');
  };

  // Don't render on server or if valid/dismissed
  if (!isClient || !envCheck || envCheck.valid || dismissed) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-50 border-b border-red-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
              <span className="text-sm font-medium text-red-900">
                Environment configuration required
              </span>
              <Link
                href="/setup"
                className="text-sm text-red-700 underline hover:text-red-800"
              >
                Configure environment →
              </Link>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-md hover:bg-red-100 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-red-600" />
          </button>
        </div>
        {envCheck.missing.length > 0 && (
          <div className="mt-2 text-xs text-red-700">
            Missing: {envCheck.missing.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}