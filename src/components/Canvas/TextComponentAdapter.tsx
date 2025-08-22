/**
 * Adapter component to bridge TextComponent between different type systems
 * This allows TextComponent to work in both Canvas.tsx (simple types) and 
 * CanvasWorkspace.tsx (complex types)
 */

import React from 'react';
import { TextComponent } from './TextComponent';
import { TextData } from '@/types/canvas';
import { Connection } from '@/types';
import { complexToSimpleConnections } from '@/utils/typeAdapters';

interface TextComponentAdapterProps {
  element: TextData;
  selected: boolean;
  connecting: string | null;
  connections: any[]; // Can be either simple or complex connections
  onSelect: (element: TextData) => void;
  onUpdate: (id: string, updates: Partial<TextData>) => void;
  onDelete: (id: string) => void;
  onConnectionStart: (elementId: string) => void;
}

export const TextComponentAdapter: React.FC<TextComponentAdapterProps> = React.memo(({
  element,
  selected,
  connecting,
  connections,
  onSelect,
  onUpdate,
  onDelete,
  onConnectionStart
}) => {
  // Adapter functions to handle type conversions
  const handleUpdate = (id: number | string, updates: any) => {
    const stringId = typeof id === 'string' ? id : id.toString();
    onUpdate(stringId, updates);
  };

  const handleDelete = (id: number | string) => {
    const stringId = typeof id === 'string' ? id : id.toString();
    onDelete(stringId);
  };

  const handleConnectionStart = (id: number | string) => {
    const stringId = typeof id === 'string' ? id : id.toString();
    onConnectionStart(stringId);
  };

  const handleSelect = (el: any, event?: React.MouseEvent) => {
    onSelect(element);
  };

  return (
    <TextComponent
      element={element}
      selected={selected}
      connecting={connecting}
      connections={connections}
      onSelect={handleSelect}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      onConnectionStart={handleConnectionStart}
    />
  );
});

TextComponentAdapter.displayName = 'TextComponentAdapter';