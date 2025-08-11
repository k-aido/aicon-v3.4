import React, { useState, useRef, useEffect } from 'react';
import { Home } from 'lucide-react';
import { useCanvasStore } from '@/store/canvasStore';

interface CanvasNavigationProps {
  lastSaved?: Date | null;
}

export const CanvasNavigation: React.FC<CanvasNavigationProps> = ({ lastSaved }) => {
  const { canvasTitle, setCanvasTitle } = useCanvasStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(canvasTitle);
  const [, setUpdateTrigger] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Update the last saved display every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setUpdateTrigger(prev => prev + 1);
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditValue(canvasTitle);
  };

  const handleSave = () => {
    const trimmedValue = editValue.trim();
    if (trimmedValue && trimmedValue !== canvasTitle) {
      setCanvasTitle(trimmedValue.slice(0, 50));
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(canvasTitle);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const formatLastSaved = () => {
    if (!lastSaved) return null;
    
    const now = new Date();
    const diff = now.getTime() - lastSaved.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return lastSaved.toLocaleDateString();
  };

  return (
    <nav className="fixed top-4 left-4 h-12 bg-white rounded-lg shadow-lg z-50 flex items-center px-4" style={{ width: 'auto' }}>
      {/* Home Button */}
      <button 
        className="p-2 hover:bg-gray-100 rounded-md transition-colors"
        onClick={() => window.location.href = '/dashboard'}
        title="Go to Dashboard"
      >
        <Home className="w-5 h-5 text-gray-700" />
      </button>

      {/* AICON Logo */}
      <div className="ml-3">
        <span className="text-lg font-bold text-gray-900">AICON</span>
      </div>

      {/* Separator */}
      <div className="mx-3 h-6 w-px bg-gray-300"></div>

      {/* Canvas Title */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          maxLength={50}
          className="text-sm font-medium text-gray-700 bg-transparent border-b-2 border-blue-500 outline-none px-1"
          style={{ minWidth: '150px' }}
        />
      ) : (
        <div
          onDoubleClick={handleDoubleClick}
          className="relative group cursor-text"
        >
          <h1 className="text-sm font-medium text-gray-700 pr-4">
            {canvasTitle}
          </h1>
          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Double-click to edit
          </span>
        </div>
      )}

      {/* Last Saved Indicator */}
      {lastSaved && formatLastSaved() && (
        <>
          <div className="mx-2 h-4 w-px bg-gray-200"></div>
          <span className="text-xs text-gray-400 flex items-center">
            <svg className="w-3 h-3 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            Saved {formatLastSaved()}
          </span>
        </>
      )}
    </nav>
  );
};