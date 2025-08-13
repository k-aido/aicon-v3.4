import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCanvasStore } from '@/store/canvasStore';
import { canvasPersistence } from '@/services/canvasPersistence';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import Image from 'next/image';

// Theme-aware PNG icon component
const ThemeIcon = ({ 
  name, 
  className = '', 
  size = 24 
}: { 
  name: string; 
  className?: string; 
  size?: number;
}) => {
  const { isDarkMode } = useTheme();
  const variant = isDarkMode ? 'darkmode' : 'lightmode';
  
  return (
    <Image 
      src={`/icons/${name}-${variant}.png`}
      alt={name}
      width={size}
      height={size}
      className={className}
    />
  );
};

// Home icon with normal association
const HomeIcon = ({ 
  className = '', 
  size = 24 
}: { 
  className?: string; 
  size?: number;
}) => {
  const { isDarkMode } = useTheme();
  // Normal association: light mode uses lightmode variant, dark mode uses darkmode variant
  const variant = isDarkMode ? 'darkmode' : 'lightmode';
  
  return (
    <Image 
      src={`/icons/home-${variant}.png`}
      alt="home"
      width={size}
      height={size}
      className={className}
    />
  );
};

interface CanvasNavigationProps {
  lastSaved?: Date | null;
}

export const CanvasNavigation: React.FC<CanvasNavigationProps> = ({ lastSaved }) => {
  const { canvasTitle, setCanvasTitle, workspaceId } = useCanvasStore();
  const { isDarkMode, toggleTheme } = useTheme();
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
      
      // Update local state immediately for responsive UI
      setCanvasTitle(newTitle);
      
      try {
        console.log('[CanvasNavigation] Saving title change:', { 
          workspaceId, 
          oldTitle: canvasTitle, 
          newTitle 
        });
        
        // Persist to database
        const success = await canvasPersistence.updateWorkspace(workspaceId, {
          title: newTitle
        });
        
        if (success) {
          console.log('[CanvasNavigation] Title saved successfully');
        } else {
          console.error('[CanvasNavigation] Failed to save title');
          // Could optionally revert the title here or show an error message
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



  return (
    <nav className="fixed top-4 left-4 bg-white dark:bg-[#323230] rounded-lg shadow-lg z-50 p-2 w-auto transition-colors duration-200 border border-[#e5e3df] dark:border-[#3e3e3c]">
      <div className="flex items-center gap-2">
        {/* Home Button - Matches toolbar button structure */}
        <button 
          className="p-4 hover:bg-[#f0ede8] dark:hover:bg-[#3e3e3c] rounded-md transition-all duration-150 cursor-pointer"
          onClick={() => window.location.href = '/dashboard'}
          title="Go to Dashboard"
        >
          <HomeIcon size={32} className="w-8 h-8" />
        </button>

        {/* AICON Logo */}
        <div className="p-4">
          <span className="text-xl font-bold text-gray-900 dark:text-gray-100">AICON</span>
        </div>

        {/* Canvas Title */}
        <div className="p-4">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              maxLength={50}
              className="text-xl font-medium text-gray-700 dark:text-gray-100 bg-transparent border-b-2 border-blue-500 outline-none px-1"
              style={{ minWidth: '150px' }}
            />
          ) : (
            <div
              onDoubleClick={handleDoubleClick}
              className="relative group cursor-text"
            >
              <h1 className="text-xl font-medium text-gray-700 dark:text-gray-100">
                {canvasTitle}
              </h1>
              <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Double-click to edit
              </span>
            </div>
          )}
        </div>

      </div>


    </nav>
  );
};