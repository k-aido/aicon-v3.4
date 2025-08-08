import React, { useState, useEffect } from 'react';
import { Check, Loader2, AlertCircle } from 'lucide-react';

interface SaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved?: Date | null;
  error?: string | null;
}

export const SaveIndicator: React.FC<SaveIndicatorProps> = ({ 
  status, 
  lastSaved,
  error 
}) => {
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    if (status === 'saved') {
      setShowMessage(true);
      const timer = setTimeout(() => setShowMessage(false), 3000);
      return () => clearTimeout(timer);
    } else if (status === 'saving' || status === 'error') {
      setShowMessage(true);
    } else {
      setShowMessage(false);
    }
  }, [status]);

  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 60) return 'Just now';
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`fixed top-20 right-4 transition-all duration-300 ${
      showMessage ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
    }`}>
      <div className={`
        flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg
        ${status === 'saving' ? 'bg-blue-50 text-blue-700' : ''}
        ${status === 'saved' ? 'bg-green-50 text-green-700' : ''}
        ${status === 'error' ? 'bg-red-50 text-red-700' : ''}
      `}>
        {status === 'saving' && (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Saving...</span>
          </>
        )}
        
        {status === 'saved' && (
          <>
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">Saved</span>
            {lastSaved && (
              <span className="text-xs opacity-75">
                • {formatLastSaved(lastSaved)}
              </span>
            )}
          </>
        )}
        
        {status === 'error' && (
          <>
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              {error || 'Failed to save'}
            </span>
          </>
        )}
      </div>
    </div>
  );
};