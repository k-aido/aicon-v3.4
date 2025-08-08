import React from 'react';
import Link from 'next/link';
import { Clock, MoreVertical, Copy, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CanvasCardProps {
  id: string;
  title: string;
  thumbnail?: string | null;
  lastModified: string;
  elementCount?: number;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
}

export const CanvasCard: React.FC<CanvasCardProps> = ({
  id,
  title,
  thumbnail,
  lastModified,
  elementCount = 0,
  onDelete,
  onDuplicate,
  onRename
}) => {
  const [showMenu, setShowMenu] = React.useState(false);
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState(title);

  const handleRename = () => {
    if (newTitle.trim() && newTitle !== title) {
      onRename?.(id, newTitle.trim());
    }
    setIsRenaming(false);
  };

  const formattedDate = formatDistanceToNow(new Date(lastModified), { 
    addSuffix: true 
  });

  return (
    <div className="group relative bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <Link href={`/canvas/${id}`}>
        <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
          {thumbnail ? (
            <img 
              src={thumbnail} 
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="text-center">
                <div className="text-4xl text-gray-300 mb-2">📋</div>
                <p className="text-sm text-gray-400">No preview</p>
              </div>
            </div>
          )}
          
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity duration-200" />
        </div>
      </Link>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {isRenaming ? (
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') {
                    setNewTitle(title);
                    setIsRenaming(false);
                  }
                }}
                className="w-full px-2 py-1 text-sm font-medium border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            ) : (
              <h3 
                className="text-sm font-medium text-gray-900 truncate cursor-pointer hover:text-gray-700"
                onClick={() => setIsRenaming(true)}
                title={title}
              >
                {title}
              </h3>
            )}
          </div>

          {/* Menu button */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.preventDefault();
                setShowMenu(!showMenu);
              }}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>

            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setIsRenaming(true);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDuplicate?.(id);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </button>
                  <hr className="my-1 border-gray-200" />
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      if (window.confirm('Are you sure you want to delete this canvas?')) {
                        onDelete?.(id);
                      }
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formattedDate}</span>
          </div>
          {elementCount > 0 && (
            <span>{elementCount} elements</span>
          )}
        </div>
      </div>
    </div>
  );
};