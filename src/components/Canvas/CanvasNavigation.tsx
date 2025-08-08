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
    </nav>
  );
};