import React, { useState, useRef, useEffect } from 'react';
import { Home, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCanvasStore } from '@/store/canvasStore';
import { canvasPersistence } from '@/services/canvasPersistence';

export const CanvasNavigation: React.FC = () => {
  const { canvasTitle, setCanvasTitle, workspaceId } = useCanvasStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(canvasTitle);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

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
    <nav className="fixed top-4 left-4 h-12 bg-white rounded-lg shadow-lg z-50 flex items-center px-4 w-auto">
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

      {/* Separator */}
      <div className="mx-3 h-6 w-px bg-gray-300"></div>

      {/* Delete Button */}
      <button
        onClick={handleDeleteCanvas}
        className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm flex items-center gap-2 transition-colors"
        title="Delete canvas"
        disabled={!workspaceId}
      >
        <Trash2 className="w-4 h-4" />
        Delete
      </button>
    </nav>
  );
};