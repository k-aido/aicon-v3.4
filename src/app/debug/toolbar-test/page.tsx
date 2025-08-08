'use client';

import React, { useState } from 'react';
import { CanvasToolbar } from '@/components/Canvas/CanvasToolbar';

export default function ToolbarTestPage() {
  const [elements, setElements] = useState<any[]>([]);
  const [viewport] = useState({ x: 0, y: 0, zoom: 1 });

  const handleAddElement = (element: any) => {
    console.log('Adding element:', element);
    setElements(prev => [...prev, element]);
  };

  const handleUpdateElement = (id: string, updates: any) => {
    console.log('Updating element:', id, updates);
    setElements(prev => prev.map(el => 
      el.id === id ? { ...el, ...updates } : el
    ));
  };

  return (
    <div className="relative w-screen h-screen bg-gray-50">
      <CanvasToolbar
        onAddElement={handleAddElement}
        onUpdateElement={handleUpdateElement}
        viewport={viewport}
      />
      
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Toolbar Test Page</h1>
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-2">Elements Added:</h2>
          <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify(elements, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}