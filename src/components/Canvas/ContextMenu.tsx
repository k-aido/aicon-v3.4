import React, { useEffect, useRef, useState } from 'react';
import { Trash2, Copy, Clipboard, FolderPlus, Link2, Info, Edit, Layers, Scissors } from 'lucide-react';
import { CanvasElement } from '@/types/canvas';

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  divider?: boolean;
}

interface ContextMenuProps {
  isOpen: boolean;
  position: ContextMenuPosition;
  targetElement: CanvasElement | null;
  targetElements?: CanvasElement[]; // For multi-selection
  onClose: () => void;
  onDelete: (elementId: string | string[]) => void;
  onCopy?: (elementId: string | string[]) => void;
  onCut?: (elementId: string | string[]) => void;
  onPaste?: () => void;
  onDuplicate?: (elementId: string | string[]) => void;
  onGroup?: (elementIds: string[]) => void;
  onUngroup?: (elementId: string) => void;
  onBringToFront?: (elementId: string | string[]) => void;
  onSendToBack?: (elementId: string | string[]) => void;
  onShowInfo?: (element: CanvasElement) => void;
  onRename?: (element: CanvasElement) => void;
  customItems?: ContextMenuItem[];
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  position,
  targetElement,
  targetElements = [],
  onClose,
  onDelete,
  onCopy,
  onCut,
  onPaste,
  onDuplicate,
  onGroup,
  onUngroup,
  onBringToFront,
  onSendToBack,
  onShowInfo,
  onRename,
  customItems = []
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Handle multiple or single selection
  const selectedElements = targetElements.length > 0 ? targetElements : (targetElement ? [targetElement] : []);
  const hasSelection = selectedElements.length > 0;
  const isMultiSelection = selectedElements.length > 1;
  const elementIds = selectedElements.map(el => el.id);

  // Adjust menu position to stay within viewport
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newX = position.x;
      let newY = position.y;

      // Adjust horizontal position
      if (position.x + rect.width > viewportWidth) {
        newX = viewportWidth - rect.width - 10;
      }

      // Adjust vertical position
      if (position.y + rect.height > viewportHeight) {
        newY = viewportHeight - rect.height - 10;
      }

      setAdjustedPosition({ x: newX, y: newY });
    }
  }, [isOpen, position]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      // Delay to prevent immediate close from the same right-click
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
      }, 0);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Build menu items
  const menuItems: ContextMenuItem[] = [];

  // Copy/Cut/Paste
  if (hasSelection) {
    if (onCopy) {
      menuItems.push({
        id: 'copy',
        label: 'Copy',
        icon: <Copy className="w-4 h-4" />,
        onClick: () => {
          onCopy(isMultiSelection ? elementIds : elementIds[0]);
          onClose();
        }
      });
    }

    if (onCut) {
      menuItems.push({
        id: 'cut',
        label: 'Cut',
        icon: <Scissors className="w-4 h-4" />,
        onClick: () => {
          onCut(isMultiSelection ? elementIds : elementIds[0]);
          onClose();
        }
      });
    }
  }

  if (onPaste) {
    menuItems.push({
      id: 'paste',
      label: 'Paste',
      icon: <Clipboard className="w-4 h-4" />,
      onClick: () => {
        onPaste();
        onClose();
      }
    });
  }

  // Duplicate
  if (hasSelection && onDuplicate) {
    menuItems.push({
      id: 'duplicate',
      label: 'Duplicate',
      icon: <Copy className="w-4 h-4" />,
      onClick: () => {
        onDuplicate(isMultiSelection ? elementIds : elementIds[0]);
        onClose();
      },
      divider: true
    });
  }

  // Group/Ungroup
  if (isMultiSelection && onGroup) {
    menuItems.push({
      id: 'group',
      label: 'Group',
      icon: <FolderPlus className="w-4 h-4" />,
      onClick: () => {
        onGroup(elementIds);
        onClose();
      }
    });
  }

  if (hasSelection && !isMultiSelection && targetElement?.type === 'folder' && onUngroup) {
    menuItems.push({
      id: 'ungroup',
      label: 'Ungroup',
      icon: <FolderPlus className="w-4 h-4" />,
      onClick: () => {
        onUngroup(elementIds[0]);
        onClose();
      }
    });
  }

  // Layer operations
  if (hasSelection && (onBringToFront || onSendToBack)) {
    if (menuItems.length > 0) {
      menuItems[menuItems.length - 1].divider = true;
    }

    if (onBringToFront) {
      menuItems.push({
        id: 'bring-to-front',
        label: 'Bring to Front',
        icon: <Layers className="w-4 h-4" />,
        onClick: () => {
          onBringToFront(isMultiSelection ? elementIds : elementIds[0]);
          onClose();
        }
      });
    }

    if (onSendToBack) {
      menuItems.push({
        id: 'send-to-back',
        label: 'Send to Back',
        icon: <Layers className="w-4 h-4" />,
        onClick: () => {
          onSendToBack(isMultiSelection ? elementIds : elementIds[0]);
          onClose();
        }
      });
    }
  }

  // Info and Rename (single selection only)
  if (hasSelection && !isMultiSelection) {
    if (menuItems.length > 0) {
      menuItems[menuItems.length - 1].divider = true;
    }

    if (onRename) {
      menuItems.push({
        id: 'rename',
        label: 'Rename',
        icon: <Edit className="w-4 h-4" />,
        onClick: () => {
          onRename(targetElement!);
          onClose();
        }
      });
    }

    if (onShowInfo) {
      menuItems.push({
        id: 'info',
        label: 'Show Info',
        icon: <Info className="w-4 h-4" />,
        onClick: () => {
          onShowInfo(targetElement!);
          onClose();
        }
      });
    }
  }

  // Custom items
  if (customItems.length > 0) {
    if (menuItems.length > 0) {
      menuItems[menuItems.length - 1].divider = true;
    }
    menuItems.push(...customItems);
  }

  // Delete (always last)
  if (hasSelection) {
    if (menuItems.length > 0) {
      menuItems[menuItems.length - 1].divider = true;
    }

    menuItems.push({
      id: 'delete',
      label: isMultiSelection ? `Delete ${selectedElements.length} items` : 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: () => {
        onDelete(isMultiSelection ? elementIds : elementIds[0]);
        onClose();
      },
      className: 'text-red-400 hover:bg-red-900 hover:bg-opacity-20'
    });
  }

  return (
    <div
      ref={menuRef}
      className="fixed bg-gray-900 rounded-lg shadow-2xl border border-gray-700 py-1 z-50 min-w-[200px]"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {menuItems.map((item, index) => (
        <React.Fragment key={item.id}>
          {item.divider && index > 0 && (
            <div className="border-t border-gray-700 my-1" />
          )}
          <button
            onClick={item.onClick}
            disabled={item.disabled}
            className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 transition-colors
              ${item.disabled 
                ? 'text-gray-500 cursor-not-allowed' 
                : item.className || 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
          >
            {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};

// Hook for managing context menu state
export const useContextMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<ContextMenuPosition>({ x: 0, y: 0 });
  const [targetElement, setTargetElement] = useState<CanvasElement | null>(null);
  const [targetElements, setTargetElements] = useState<CanvasElement[]>([]);

  const openContextMenu = (
    event: React.MouseEvent,
    element?: CanvasElement,
    elements?: CanvasElement[]
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setPosition({ x: event.clientX, y: event.clientY });
    setTargetElement(element || null);
    setTargetElements(elements || []);
    setIsOpen(true);
  };

  const closeContextMenu = () => {
    setIsOpen(false);
    setTargetElement(null);
    setTargetElements([]);
  };

  return {
    isOpen,
    position,
    targetElement,
    targetElements,
    openContextMenu,
    closeContextMenu
  };
};

export default ContextMenu;