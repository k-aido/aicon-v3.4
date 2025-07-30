import React, { useState, useRef, useEffect } from 'react';
import { Home } from 'lucide-react';
import { useCanvasStore } from '@/store/canvasStore';

export const CanvasNavigation: React.FC = () => {
  const { canvasTitle, setCanvasTitle } = useCanvasStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(canvasTitle);
  const inputRef = useRef<HTMLInputElement>(null);

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

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 flex items-center px-6">
      {/* Logo Section */}
      <div className="flex items-center gap-3">
        <button 
          className="flex items-center gap-2 hover:bg-gray-100 p-2 rounded-lg transition-colors"
          onClick={() => window.location.href = '/'}
          title="Go to Dashboard"
        >
          <Home className="w-5 h-5 text-gray-700" />
          <span className="text-lg font-semibold text-gray-900">AICON</span>
        </button>
      </div>

      {/* Canvas Title - Centered */}
      <div className="flex-1 flex justify-center">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            maxLength={50}
            className="text-xl font-semibold text-gray-800 bg-transparent border-b-2 border-blue-500 outline-none px-2 py-1"
            style={{ minWidth: '200px', maxWidth: '400px' }}
          />
        ) : (
          <div
            onDoubleClick={handleDoubleClick}
            className="relative group cursor-text"
          >
            <h1 className="text-xl font-semibold text-gray-800 px-2 py-1">
              {canvasTitle}
            </h1>
            <div className="absolute inset-0 border-2 border-transparent group-hover:border-gray-300 rounded-md transition-colors" />
            <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Double-click to edit
            </span>
          </div>
        )}
      </div>

      {/* Right spacer for balance */}
      <div className="w-[140px]" />
    </nav>
  );
};