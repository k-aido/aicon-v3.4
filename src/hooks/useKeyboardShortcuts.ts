import { useEffect, useCallback, useRef } from 'react';
import { CanvasElement } from '@/types/canvas';

interface UseKeyboardShortcutsProps {
  selectedElementIds: string[];
  elements: Record<string, CanvasElement>;
  enabled?: boolean;
  onCopy?: (elements: CanvasElement[]) => void;
  onCut?: (elements: CanvasElement[]) => void;
  onPaste?: () => void;
  onDelete?: (elementIds: string[]) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSelectAll?: () => void;
  onDuplicate?: (elements: CanvasElement[]) => void;
  onSave?: () => void;
  onEscape?: () => void;
  customShortcuts?: Array<{
    key: string;
    ctrlOrCmd?: boolean;
    shift?: boolean;
    alt?: boolean;
    handler: () => void;
  }>;
}

export const useKeyboardShortcuts = ({
  selectedElementIds,
  elements,
  enabled = true,
  onCopy,
  onCut,
  onPaste,
  onDelete,
  onUndo,
  onRedo,
  onSelectAll,
  onDuplicate,
  onSave,
  onEscape,
  customShortcuts = []
}: UseKeyboardShortcutsProps) => {
  const isProcessingRef = useRef(false);

  // Get selected elements
  const getSelectedElements = useCallback(() => {
    return selectedElementIds
      .map(id => elements[id])
      .filter(Boolean);
  }, [selectedElementIds, elements]);

  // Check if target is an input element
  const isInputElement = (target: EventTarget | null): boolean => {
    if (!target || !(target instanceof Element)) return false;
    const tagName = target.tagName.toLowerCase();
    return tagName === 'input' || 
           tagName === 'textarea' || 
           tagName === 'select' ||
           (target as HTMLElement).contentEditable === 'true';
  };

  // Get platform-specific modifier key
  const getModifierKey = useCallback((event: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    return isMac ? event.metaKey : event.ctrlKey;
  }, []);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled || isProcessingRef.current || isInputElement(event.target)) {
      return;
    }

    const key = event.key.toLowerCase();
    const ctrlOrCmd = getModifierKey(event);
    const shift = event.shiftKey;
    const alt = event.altKey;

    // Prevent multiple rapid executions
    const preventDefaultAndProcess = (handler: () => void) => {
      event.preventDefault();
      event.stopPropagation();
      isProcessingRef.current = true;
      handler();
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 100);
    };

    // Copy (Ctrl/Cmd + C)
    if (ctrlOrCmd && key === 'c' && !shift && !alt && onCopy) {
      const selected = getSelectedElements();
      if (selected.length > 0) {
        preventDefaultAndProcess(() => onCopy(selected));
      }
      return;
    }

    // Cut (Ctrl/Cmd + X)
    if (ctrlOrCmd && key === 'x' && !shift && !alt && onCut) {
      const selected = getSelectedElements();
      if (selected.length > 0) {
        preventDefaultAndProcess(() => onCut(selected));
      }
      return;
    }

    // Paste (Ctrl/Cmd + V)
    if (ctrlOrCmd && key === 'v' && !shift && !alt && onPaste) {
      preventDefaultAndProcess(() => onPaste());
      return;
    }

    // Delete (Delete or Backspace)
    if ((key === 'delete' || key === 'backspace') && !ctrlOrCmd && !shift && !alt && onDelete) {
      if (selectedElementIds.length > 0) {
        preventDefaultAndProcess(() => onDelete(selectedElementIds));
      }
      return;
    }

    // Select All (Ctrl/Cmd + A)
    if (ctrlOrCmd && key === 'a' && !shift && !alt && onSelectAll) {
      preventDefaultAndProcess(() => onSelectAll());
      return;
    }

    // Duplicate (Ctrl/Cmd + D)
    if (ctrlOrCmd && key === 'd' && !shift && !alt && onDuplicate) {
      const selected = getSelectedElements();
      if (selected.length > 0) {
        preventDefaultAndProcess(() => onDuplicate(selected));
      }
      return;
    }

    // Undo (Ctrl/Cmd + Z)
    if (ctrlOrCmd && key === 'z' && !shift && !alt && onUndo) {
      preventDefaultAndProcess(() => onUndo());
      return;
    }

    // Redo (Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y)
    if (((ctrlOrCmd && shift && key === 'z') || (ctrlOrCmd && key === 'y' && !shift)) && !alt && onRedo) {
      preventDefaultAndProcess(() => onRedo());
      return;
    }

    // Save (Ctrl/Cmd + S)
    if (ctrlOrCmd && key === 's' && !shift && !alt && onSave) {
      preventDefaultAndProcess(() => onSave());
      return;
    }

    // Escape
    if (key === 'escape' && !ctrlOrCmd && !shift && !alt && onEscape) {
      preventDefaultAndProcess(() => onEscape());
      return;
    }

    // Custom shortcuts
    customShortcuts.forEach(shortcut => {
      const matchesKey = shortcut.key.toLowerCase() === key;
      const matchesCtrl = shortcut.ctrlOrCmd ? ctrlOrCmd : !ctrlOrCmd;
      const matchesShift = shortcut.shift ? shift : !shift;
      const matchesAlt = shortcut.alt ? alt : !alt;

      if (matchesKey && matchesCtrl && matchesShift && matchesAlt) {
        preventDefaultAndProcess(shortcut.handler);
      }
    });
  }, [
    enabled,
    selectedElementIds,
    getSelectedElements,
    getModifierKey,
    onCopy,
    onCut,
    onPaste,
    onDelete,
    onSelectAll,
    onDuplicate,
    onUndo,
    onRedo,
    onSave,
    onEscape,
    customShortcuts
  ]);

  // Set up event listeners
  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  // Return clipboard actions for programmatic use
  return {
    copy: () => {
      const selected = getSelectedElements();
      if (selected.length > 0 && onCopy) {
        onCopy(selected);
      }
    },
    cut: () => {
      const selected = getSelectedElements();
      if (selected.length > 0 && onCut) {
        onCut(selected);
      }
    },
    paste: () => {
      if (onPaste) {
        onPaste();
      }
    },
    deleteSelected: () => {
      if (selectedElementIds.length > 0 && onDelete) {
        onDelete(selectedElementIds);
      }
    },
    duplicate: () => {
      const selected = getSelectedElements();
      if (selected.length > 0 && onDuplicate) {
        onDuplicate(selected);
      }
    }
  };
};