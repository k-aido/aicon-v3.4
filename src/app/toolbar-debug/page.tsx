'use client';

import React, { useState } from 'react';
import { CanvasToolbar } from '@/components/Canvas/CanvasToolbar';

export default function ToolbarDebugPage() {
  const [elements, setElements] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleAddElement = (element: any) => {
    addLog(`onAddElement called with: ${JSON.stringify(element, null, 2)}`);
    setElements(prev => [...prev, element]);
  };

  const handleUpdateElement = (id: string, updates: any) => {
    addLog(`onUpdateElement called with id: ${id}, updates: ${JSON.stringify(updates)}`);
  };

  return (
    <div className="relative w-full h-screen bg-gray-100">
      {/* Canvas area with elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="relative w-full h-full">
          {elements.map((element, index) => (
            <div
              key={element.id}
              className="absolute bg-white rounded-lg shadow-lg p-4 border-2 border-purple-500"
              style={{
                left: element.position.x,
                top: element.position.y,
                width: element.dimensions.width,
                height: element.dimensions.height
              }}
            >
              <div className="font-bold text-lg">{element.type}</div>
              <div className="text-sm text-gray-600">
                {element.type === 'folder' ? element.name : element.title}
              </div>
              <div className="text-xs text-gray-400 mt-2">
                ID: {element.id}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <CanvasToolbar
        onAddElement={handleAddElement}
        viewport={{ x: 0, y: 0, zoom: 1 }}
      />

      {/* Debug panel */}
      <div className="fixed right-4 top-4 w-96 max-h-[80vh] bg-white rounded-lg shadow-xl p-4 overflow-hidden">
        <h2 className="text-lg font-bold mb-2">Debug Logs</h2>
        <div className="overflow-y-auto max-h-[60vh] bg-gray-50 rounded p-2 text-xs font-mono">
          {logs.length === 0 ? (
            <div className="text-gray-400">Click toolbar icons to see logs...</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="mb-1">{log}</div>
            ))
          )}
        </div>
        <div className="mt-4">
          <h3 className="font-semibold mb-1">Elements: {elements.length}</h3>
          <button
            onClick={() => {
              setElements([]);
              setLogs([]);
              addLog('Cleared all elements and logs');
            }}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white p-4 rounded-lg">
        <p>Click the Folder or AI Chat icons in the toolbar. Check the debug panel for logs.</p>
        <p className="text-sm mt-1">Open browser console for additional debugging info.</p>
      </div>
    </div>
  );
}