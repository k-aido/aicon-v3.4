import { useEffect, useRef, useCallback } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { debounce } from '@/utils/debounce';

interface UseAutoSaveOptions {
  enabled?: boolean;
  delay?: number; // milliseconds
  onSaveStart?: () => void;
  onSaveComplete?: (success: boolean) => void;
  onSaveError?: (error: Error) => void;
}

export const useAutoSave = (options: UseAutoSaveOptions = {}) => {
  const {
    enabled = true,
    delay = 2000, // 2 seconds default
    onSaveStart,
    onSaveComplete,
    onSaveError
  } = options;

  const {
    elements,
    connections,
    canvasTitle
  } = useCanvasStore();
  
  // These properties are not defined in the store, using defaults
  const workspaceId = 'default-workspace';
  const autoSaveEnabled = true;
  const isSaving = false;
  
  const saveToDatabase = async (): Promise<boolean> => {
    console.log('Auto-save: Saving to database (stub implementation)');
    return Promise.resolve(true);
  };

  const lastSaveDataRef = useRef<string>('');
  const saveInProgressRef = useRef(false);

  // Create a stable reference to the save function
  const performSave = useCallback(async () => {
    if (!workspaceId || !autoSaveEnabled || !enabled || saveInProgressRef.current) {
      return;
    }

    // Create a snapshot of current data
    const currentData = JSON.stringify({
      elements,
      connections,
      canvasTitle
    });

    // Check if data has changed
    if (currentData === lastSaveDataRef.current) {
      return;
    }

    saveInProgressRef.current = true;
    onSaveStart?.();

    try {
      const success = await saveToDatabase();
      
      if (success) {
        lastSaveDataRef.current = currentData;
        onSaveComplete?.(true);
      } else {
        onSaveComplete?.(false);
      }
    } catch (error) {
      console.error('Auto-save error:', error);
      onSaveError?.(error as Error);
      onSaveComplete?.(false);
    } finally {
      saveInProgressRef.current = false;
    }
  }, [
    workspaceId,
    autoSaveEnabled,
    enabled,
    elements,
    connections,
    canvasTitle,
    saveToDatabase,
    onSaveStart,
    onSaveComplete,
    onSaveError
  ]);

  // Create debounced save function
  const debouncedSave = useRef(
    debounce(performSave, delay)
  ).current;

  // Watch for changes and trigger auto-save
  useEffect(() => {
    if (!workspaceId || !autoSaveEnabled || !enabled) {
      return;
    }

    // Call debounced save on any change
    debouncedSave();

    // Cleanup
    return () => {
      debouncedSave.cancel();
    };
  }, [elements, connections, canvasTitle, workspaceId, autoSaveEnabled, enabled, debouncedSave]);

  // Save immediately when component unmounts
  useEffect(() => {
    return () => {
      if (workspaceId && autoSaveEnabled && enabled && !saveInProgressRef.current) {
        // Perform synchronous save on unmount
        performSave();
      }
    };
  }, []);

  return {
    isSaving,
    performSave
  };
};