'use client';

import React, { useState, useCallback } from 'react';
import { CanvasElement, ChatElement, ContentElement, Connection, Platform } from '@/types';
import { Canvas } from '@/components/Canvas/Canvas';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { AddContentModal } from '@/components/Modal/AddContentModal';

/**
 * Main AICON Canvas Application Component
 * Provides a drag-and-drop canvas interface with AI chat and content elements
 */
const AiconCanvasApp: React.FC = () => {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<CanvasElement | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connecting, setConnecting] = useState<string | number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);

  /**
   * Handles adding content from sidebar
   */
  const handleAddContent = useCallback((platform: Platform) => {
    setSelectedPlatform(platform);
    setShowAddModal(true);
  }, []);

  /**
   * Handles adding a new chat element
   */
  const handleAddChat = useCallback(() => {
    const newChat: ChatElement = {
      id: Date.now(),
      type: 'chat',
      x: 300,
      y: 100,
      width: 700,
      height: 500,
      messages: []
    };
    setElements(prev => [...prev, newChat]);
  }, []);

  /**
   * Handles adding content to canvas from modal
   */
  const handleAddContentToCanvas = useCallback((contentData: Partial<ContentElement>) => {
    const newContent: ContentElement = {
      id: Date.now(),
      type: 'content',
      x: 100,
      y: 100,
      url: contentData.url || '',
      title: contentData.title || 'Untitled',
      thumbnail: contentData.thumbnail || '',
      platform: contentData.platform || 'unknown',
      width: contentData.width || 280,
      height: contentData.height || 220
    };
    setElements(prev => [...prev, newContent]);
  }, []);

  return (
    <div className="h-screen flex bg-gray-900">
      <Sidebar 
        onAddContent={handleAddContent} 
        onAddChat={handleAddChat} 
      />
      
      <Canvas
        elements={elements}
        setElements={setElements}
        selectedElement={selectedElement}
        setSelectedElement={setSelectedElement}
        connections={connections}
        setConnections={setConnections}
        connecting={connecting}
        setConnecting={setConnecting}
      />

      <AddContentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddContentToCanvas}
        selectedPlatform={selectedPlatform}
      />
    </div>
  );
};

export default AiconCanvasApp;