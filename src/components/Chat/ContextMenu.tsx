import React, { useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onDelete: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, onDelete }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [onClose]);

  const handleDelete = () => {
    onDelete();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[140px]"
      style={{
        left: x,
        top: y,
      }}
    >
      <button
        onClick={handleDelete}
        className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 text-sm transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        Delete chat
      </button>
    </div>
  );
};