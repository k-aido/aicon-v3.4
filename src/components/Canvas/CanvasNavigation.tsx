import React, { useState, useRef, useEffect } from 'react';
import { Home, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCanvasStore } from '@/store/canvasStore';
import { canvasPersistence } from '@/services/canvasPersistence';
import { useDarkMode, darkModeColors } from '@/contexts/DarkModeContext';

interface CanvasNavigationProps {
  lastSaved?: Date | null;
}

export const CanvasNavigation: React.FC<CanvasNavigationProps> = ({ lastSaved }) => {
  const { canvasTitle, setCanvasTitle, workspaceId } = useCanvasStore();
  const { isDarkMode } = useDarkMode();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(canvasTitle);
  const [, setUpdateTrigger] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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

  const handleSave = async () => {
    const trimmedValue = editValue.trim();
    if (trimmedValue && trimmedValue !== canvasTitle && workspaceId) {
      const newTitle = trimmedValue.slice(0, 50);
      
      try {
        console.log('[CanvasNavigation] Saving title change:', { 
          workspaceId, 
          oldTitle: canvasTitle, 
          newTitle 
        });
        
        // Persist to database FIRST before updating store
        // This prevents the autosave from triggering with the new title
        const success = await canvasPersistence.updateWorkspace(workspaceId, {
          title: newTitle
        });
        
        if (success) {
          console.log('[CanvasNavigation] Title saved successfully');
          // Only update the store after successful save
          setCanvasTitle(newTitle);
        } else {
          console.error('[CanvasNavigation] Failed to save title');
          // Don't update the store if save failed
        }
      } catch (error) {
        console.error('[CanvasNavigation] Error saving title:', error);
        // Could optionally revert the title here or show an error message
      }
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

  const handleDeleteCanvas = async () => {
    if (!workspaceId) {
      console.error('[CanvasNavigation] No workspace ID available for deletion');
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to delete this canvas? All elements and connections will be permanently removed.'
    );
    
    if (!confirmed) return;
    
    try {
      console.log('[CanvasNavigation] Deleting canvas:', workspaceId);
      const success = await canvasPersistence.deleteWorkspace(workspaceId);
      
      if (success) {
        console.log('[CanvasNavigation] Canvas deleted successfully');
        // Navigate back to dashboard
        router.push('/dashboard');
      } else {
        console.error('[CanvasNavigation] Failed to delete canvas');
        alert('Failed to delete canvas.');
      }
    } catch (error) {
      console.error('[CanvasNavigation] Error deleting canvas:', error);
      alert('An error occurred while deleting the canvas.');
    }
  };

  return (
    <nav className={`fixed top-4 left-4 h-12 rounded-lg shadow-lg z-50 flex items-center px-4 w-auto transition-colors duration-200`}
      style={{
        backgroundColor: isDarkMode ? '#202a37' : '#ffffff'
      }}>
      {/* Home Button */}
      <button 
        className={`p-2 rounded-md transition-colors ${
          isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
        }`}
        onClick={() => window.location.href = '/dashboard'}
        title="Go to Dashboard"
      >
        <Home className="w-5 h-5" />
      </button>

      {/* AICON Logo */}
      <div className="ml-3">
        <span className={`text-lg font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
          AICON
        </span>
      </div>

      {/* Separator */}
      <div className={`mx-3 h-6 w-px ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>

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
          className={`text-sm font-medium bg-transparent border-b-2 border-blue-500 outline-none px-1 ${
            isDarkMode ? 'text-gray-200' : 'text-gray-700'
          }`}
          style={{ minWidth: '150px' }}
        />
      ) : (
        <div
          onDoubleClick={handleDoubleClick}
          className="relative group cursor-text"
        >
          <h1 className={`text-sm font-medium pr-4 ${
            isDarkMode ? 'text-gray-200' : 'text-gray-700'
          }`}>
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
          <div className={`mx-2 h-4 w-px ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div>
          <span className={`text-xs flex items-center ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`}>
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            Saved {formatLastSaved()}
          </span>
        </>
      )}

    </nav>
  );
};