import React, { useState, useRef, useCallback, useMemo } from 'react';
import { ContentPieceComponent } from './ContentPieceComponent';
import { CreatorContentElement } from './CreatorContentElement';
import { FolderComponent } from './FolderComponent';
import { TextComponentAdapter } from './TextComponentAdapter';
import { ChatInterface } from '@/components/Chat/ChatInterface';
import { ContextMenu, useContextMenu } from './ContextMenu';
import { ContentDetailsPanel } from '../Sidebar/ContentDetailsPanel';
import { ChatSidebar } from '../Sidebar/ChatSidebar';
import { CanvasToolbar } from './CanvasToolbar';
import { InteractionTester } from './InteractionTester';
import { useCanvasInteractions } from '@/hooks/useCanvasInteractions';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useCanvasDrag } from '@/hooks/useCanvasDrag';
import { 
  CanvasElement, 
  ContentPiece, 
  FolderData, 
  ChatData,
  TextData, 
  Connection, 
  CanvasState,
  Viewport,
  Position 
} from '@/types/canvas';

interface CanvasWorkspaceProps {
  workspaceId: string;
  initialState?: Partial<CanvasState>;
  onStateChange?: (state: CanvasState) => void;
  onSave?: (state: CanvasState) => void;
}

export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  workspaceId,
  initialState,
  onStateChange,
  onSave
}) => {
  // Canvas state
  const [elements, setElements] = useState<Record<string, CanvasElement>>(
    initialState?.elements || {}
  );
  const [connections, setConnections] = useState<Connection[]>(
    initialState?.connections || []
  );
  const [viewport, setViewport] = useState<Viewport>(
    initialState?.viewport || { x: 0, y: 0, zoom: 1 }
  );
  const [connecting, setConnecting] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<{
    elements: CanvasElement[];
    connections: Connection[];
  } | null>(null);

  // Panel states
  const [contentDetailsPanelOpen, setContentDetailsPanelOpen] = useState(false);
  const [selectedContentForDetails, setSelectedContentForDetails] = useState<ContentPiece | null>(null);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);

  // Canvas interactions
  const {
    selectedElementIds,
    selectedElements,
    selectElement,
    clearSelection,
    selectAll,
    selectInArea
  } = useCanvasInteractions({
    elements,
    onSelectionChange: (ids) => {
      // Update state when selection changes
      const newState: CanvasState = {
        elements,
        connections,
        viewport,
        selection: { elementIds: ids, connectionIds: [] },
        clipboard: clipboard || undefined
      };
      onStateChange?.(newState);
    }
  });

  // Context menu
  const {
    isOpen: contextMenuOpen,
    position: contextMenuPosition,
    targetElement: contextMenuTarget,
    openContextMenu,
    closeContextMenu
  } = useContextMenu();

  // Canvas drag for panning
  const { isDragging: isPanning, handleMouseDown: handlePanStart } = useCanvasDrag({
    onDragMove: (position) => setViewport(prev => ({ ...prev, ...position })),
    onDragEnd: () => {}
  });

  // Get connected content for chat
  const getConnectedContent = useCallback((chatId: string): ContentPiece[] => {
    return connections
      .filter(conn => conn.target.elementId === chatId)
      .map(conn => elements[conn.source.elementId])
      .filter((el): el is ContentPiece => el?.type === 'content');
  }, [connections, elements]);

  // Element handlers
  const handleAddElement = useCallback((element: CanvasElement) => {
    console.log('[CanvasWorkspace] handleAddElement called with:', element);
    setElements(prev => {
      const updated = {
        ...prev,
        [element.id]: element
      };
      console.log('[CanvasWorkspace] Elements after update:', Object.keys(updated).length, 'elements');
      return updated;
    });
    
    // Notify parent of state change
    if (onStateChange) {
      const newState = {
        elements: { ...elements, [element.id]: element },
        connections,
        viewport,
        selection: { elementIds: selectedElementIds, connectionIds: [] },
        clipboard: clipboard || undefined
      };
      onStateChange(newState);
    }
  }, [elements, connections, viewport, selectedElementIds, clipboard, onStateChange]);

  const handleElementUpdate = useCallback((id: string, updates: Partial<CanvasElement>) => {
    setElements(prev => ({
      ...prev,
      [id]: { ...prev[id], ...updates, updatedAt: new Date() } as CanvasElement
    }));
  }, []);

  const handleElementDelete = useCallback((id: string | string[]) => {
    const idsToDelete = Array.isArray(id) ? id : [id];
    
    setElements(prev => {
      const newElements = { ...prev };
      idsToDelete.forEach(elementId => {
        delete newElements[elementId];
      });
      return newElements;
    });

    // Remove related connections
    setConnections(prev => 
      prev.filter(conn => 
        !idsToDelete.includes(conn.source.elementId) && 
        !idsToDelete.includes(conn.target.elementId)
      )
    );

    clearSelection();
  }, [clearSelection]);

  const handleFolderDeleteWithContents = useCallback((folderId: string, contentIds: string[]) => {
    handleElementDelete([folderId, ...contentIds]);
  }, [handleElementDelete]);

  // Connection handlers
  const handleConnectionStart = useCallback((elementId: string) => {
    if (connecting) {
      if (connecting !== elementId) {
        // Create connection
        const newConnection: Connection = {
          id: `conn-${Date.now()}`,
          source: { elementId: connecting, anchor: 'right' },
          target: { elementId, anchor: 'left' },
          type: 'data',
          style: { color: '#8B5CF6', animated: true }
        };
        setConnections(prev => [...prev, newConnection]);
      }
      setConnecting(null);
    } else {
      setConnecting(elementId);
    }
  }, [connecting]);

  // Panel handlers
  const handleOpenContentDetails = useCallback((content: ContentPiece) => {
    setSelectedContentForDetails(content);
    setContentDetailsPanelOpen(true);
  }, []);

  const handleAnalyzeContent = useCallback((content: ContentPiece) => {
    // Mock analysis
    const mockAnalysis = {
      id: `analysis-${Date.now()}`,
      contentId: content.id,
      summary: 'This content covers advanced React hooks patterns and best practices.',
      keyPoints: [
        'Strong opening hook with problem statement',
        'Clear code examples and explanations',
        'Practical implementation tips',
        'Subscribe for more React content'
      ],
      sentiment: 'positive' as const,
      topics: [
        { name: 'React', confidence: 0.95 },
        { name: 'JavaScript', confidence: 0.8 },
        { name: 'Web Development', confidence: 0.7 }
      ],
      entities: [],
      language: 'en',
      complexity: 'moderate' as const,
      analyzedAt: new Date()
    };

    handleElementUpdate(content.id, { 
      analysis: mockAnalysis,
      metadata: { ...content.metadata, analysisInProgress: false }
    });
  }, [handleElementUpdate]);

  // Keyboard shortcuts
  const keyboardActions = useKeyboardShortcuts({
    selectedElementIds,
    elements,
    onCopy: (elements) => {
      setClipboard({ elements, connections: [] });
    },
    onPaste: () => {
      if (clipboard?.elements) {
        const pastedElements: Record<string, CanvasElement> = {};
        clipboard.elements.forEach(element => {
          const newId = `${element.id}-copy-${Date.now()}`;
          pastedElements[newId] = {
            ...element,
            id: newId,
            position: {
              x: element.position.x + 50,
              y: element.position.y + 50
            },
            createdAt: new Date(),
            updatedAt: new Date()
          };
        });
        setElements(prev => ({ ...prev, ...pastedElements }));
      }
    },
    onDelete: handleElementDelete,
    onSelectAll: selectAll,
    onSave: () => {
      const currentState: CanvasState = {
        elements,
        connections,
        viewport,
        selection: { elementIds: selectedElementIds, connectionIds: [] },
        clipboard: clipboard || undefined
      };
      onSave?.(currentState);
    },
    onEscape: () => {
      clearSelection();
      setConnecting(null);
      closeContextMenu();
    }
  });

  // Canvas event handlers
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-background')) {
      clearSelection();
      setConnecting(null);
    }
  }, [clearSelection]);

  const handleCanvasContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    openContextMenu(e);
  }, [openContextMenu]);

  // Handle drop from toolbar
  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    const toolData = e.dataTransfer.getData('tool');
    if (!toolData) return;
    
    try {
      const tool = JSON.parse(toolData);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      // Calculate drop position relative to viewport
      const x = (e.clientX - rect.left - viewport.x) / viewport.zoom;
      const y = (e.clientY - rect.top - viewport.y) / viewport.zoom;
      
      // Create new element based on tool type
      const id = `${tool.type}-${Date.now()}`;
      const baseElement = {
        id,
        position: { x: x - 160, y: y - 120 }, // Center on cursor
        zIndex: tool.type === 'folder' ? 0 : tool.type === 'chat' ? 2 : 1,
        isVisible: true,
        isLocked: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      let newElement: CanvasElement;

      if (tool.type === 'chat') {
        newElement = {
          ...baseElement,
          type: 'chat',
          dimensions: { width: 600, height: 700 },
          title: 'New AI Chat',
          model: 'gpt-4',
          messages: [],
          connectedContentIds: [],
          status: 'idle'
        } as ChatData;
      } else if (tool.type === 'folder') {
        newElement = {
          ...baseElement,
          type: 'folder',
          dimensions: { width: 350, height: 250 },
          name: 'New Profile Collection',
          description: '',
          color: tool.color || '#3B82F6',
          childIds: [],
          isExpanded: true
        } as FolderData;
      } else if (tool.type === 'text') {
        newElement = {
          ...baseElement,
          type: 'text',
          dimensions: { width: 400, height: 300 },
          title: 'New Text',
          content: '',
          lastModified: new Date()
        } as TextData;
      } else {
        // Content piece
        newElement = {
          ...baseElement,
          type: 'content',
          dimensions: { width: 320, height: 240 },
          url: 'https://example.com',
          title: `New ${tool.label} Content`,
          thumbnail: `https://via.placeholder.com/320x240?text=${encodeURIComponent(tool.label)}&bg=${(tool.color || '#3B82F6').slice(1)}&color=ffffff`,
          platform: tool.platform || 'unknown',
          viewCount: Math.floor(Math.random() * 100000),
          likeCount: Math.floor(Math.random() * 5000),
          commentCount: Math.floor(Math.random() * 500),
          tags: [tool.platform || 'content'].filter(Boolean)
        } as ContentPiece;
      }
      
      handleAddElement(newElement);
    } catch (error) {
      console.error('Failed to parse tool data:', error);
    }
  }, [viewport, handleAddElement]);

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // Render connection lines
  const connectionLines = useMemo(() => {
    return connections.map(connection => {
      const sourceElement = elements[connection.source.elementId];
      const targetElement = elements[connection.target.elementId];

      if (!sourceElement || !targetElement) return null;

      const sourcePos = {
        x: sourceElement.position.x + sourceElement.dimensions.width,
        y: sourceElement.position.y + sourceElement.dimensions.height / 2
      };

      const targetPos = {
        x: targetElement.position.x,
        y: targetElement.position.y + targetElement.dimensions.height / 2
      };

      const distance = Math.abs(targetPos.x - sourcePos.x);
      const controlPointOffset = Math.min(distance * 0.5, 100);

      const path = `M ${sourcePos.x} ${sourcePos.y} C ${sourcePos.x + controlPointOffset} ${sourcePos.y}, ${targetPos.x - controlPointOffset} ${targetPos.y}, ${targetPos.x} ${targetPos.y}`;

      return (
        <path
          key={connection.id}
          d={path}
          stroke={connection.style?.color || '#8B5CF6'}
          strokeWidth="2"
          fill="none"
          strokeDasharray={connection.style?.animated ? "5 5" : undefined}
          className={connection.style?.animated ? 'animate-pulse' : ''}
        />
      );
    });
  }, [connections, elements]);

  return (
    <div className="h-screen w-full bg-gray-100 relative overflow-hidden">
      {/* Chat Sidebar */}
      <ChatSidebar
        chats={Object.values(elements).filter((el): el is ChatData => el.type === 'chat')}
        selectedChatId={selectedChatId}
        isOpen={chatSidebarOpen}
        onToggle={() => setChatSidebarOpen(!chatSidebarOpen)}
        onSelectChat={setSelectedChatId}
        onNewConversation={() => {
          const newChat: ChatData = {
            id: `chat-${Date.now()}`,
            type: 'chat',
            position: { x: 200, y: 200 },
            dimensions: { width: 600, height: 700 },
            zIndex: 2,
            isVisible: true,
            isLocked: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            title: 'New Conversation',
            model: 'gpt-4',
            messages: [],
            connectedContentIds: [],
            status: 'idle'
          };
          setElements(prev => ({ ...prev, [newChat.id]: newChat }));
        }}
      />

      {/* Main Canvas */}
      <div 
        ref={canvasRef}
        className="flex-1 relative overflow-hidden"
        onClick={handleCanvasClick}
        onContextMenu={handleCanvasContextMenu}
        onDrop={handleCanvasDrop}
        onDragOver={handleCanvasDragOver}
        onMouseDown={(e) => {
          if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-background')) {
            handlePanStart(e, viewport);
          }
        }}
      >
        {/* Dot Grid Background */}
        <div 
          className={`absolute inset-0 canvas-background ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{
            // Keep dots visible until very low zoom levels
            opacity: viewport.zoom < 0.25 ? 0 : viewport.zoom < 0.4 ? (viewport.zoom - 0.25) * 6.67 : 1,
            // Use consistent dot appearance
            backgroundImage: viewport.zoom < 0.25 
              ? 'none'
              : `radial-gradient(circle, #d4d4d8 1px, transparent 1px)`,
            // Scale grid size with zoom, with larger spacing when zoomed out
            backgroundSize: viewport.zoom < 0.5 
              ? '40px 40px'  // Fixed larger grid when zoomed out
              : `${20 * viewport.zoom}px ${20 * viewport.zoom}px`, // Scale with zoom when zoomed in
            backgroundPosition: `${viewport.x}px ${viewport.y}px`,
            backgroundColor: '#fafafa',
            transition: 'opacity 0.15s ease-out'
          }}
        />
        
        {/* Canvas Elements Container */}
        <div 
          style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
            transformOrigin: '0 0'
          }}
          className="absolute inset-0"
        >
          {/* Connection Lines */}
          <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            <defs>
              <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#8b5cf6" stopOpacity="1" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.3" />
              </linearGradient>
            </defs>
            {connectionLines}
          </svg>

          {/* Canvas Elements */}
          {Object.values(elements).map(element => {
            const isSelected = selectedElementIds.includes(element.id);

            if (element.type === 'content') {
              // Check if this is a creator content element (has creatorId in metadata)
              const isCreatorContent = (element as any).metadata?.creatorId;
              
              if (isCreatorContent) {
                return (
                  <CreatorContentElement
                    key={element.id}
                    element={element as any}
                    selected={isSelected}
                    connecting={connecting}
                    connections={connections}
                    onSelect={() => selectElement(element.id)}
                    onUpdate={(id: string, updates: any) => handleElementUpdate(id, updates)}
                    onDelete={handleElementDelete}
                    onConnectionStart={handleConnectionStart}
                    onOpenDetails={(elem: any) => handleOpenContentDetails(elem)}
                    onAnalyze={(elem: any) => handleAnalyzeContent(elem)}
                  />
                );
              } else {
                return (
                  <ContentPieceComponent
                    key={element.id}
                    element={element as ContentPiece}
                    selected={isSelected}
                    connecting={connecting}
                    connections={connections}
                    onSelect={() => selectElement(element.id)}
                    onUpdate={handleElementUpdate}
                    onDelete={handleElementDelete}
                    onConnectionStart={handleConnectionStart}
                    onOpenDetails={handleOpenContentDetails}
                    onAnalyze={handleAnalyzeContent}
                  />
                );
              }
            }

            if (element.type === 'folder') {
              return (
                <FolderComponent
                  key={element.id}
                  folder={element as FolderData}
                  elements={elements}
                  selected={isSelected}
                  connecting={connecting}
                  connections={connections}
                  onSelect={() => selectElement(element.id)}
                  onUpdate={handleElementUpdate}
                  onDelete={handleElementDelete}
                  onDeleteWithContents={handleFolderDeleteWithContents}
                  onConnectionStart={handleConnectionStart}
                  onUpdateChildPosition={(childId, position) => handleElementUpdate(childId, { position })}
                />
              );
            }

            if (element.type === 'chat') {
              const connectedContent = getConnectedContent(element.id);
              return (
                <div
                  key={element.id}
                  className="absolute pointer-events-auto"
                  style={{
                    transform: `translate(${element.position.x}px, ${element.position.y}px)`,
                    width: element.dimensions.width,
                    height: element.dimensions.height
                  }}
                >
                  <ChatInterface
                    element={{
                      ...element,
                      id: Number(element.id),
                      x: 0,
                      y: 0,
                      width: element.dimensions.width,
                      height: element.dimensions.height
                    } as any}
                    connections={connections as any}
                    allElements={elements as any}
                    onDelete={(id: string | number) => handleElementDelete(String(id))}
                  />
                </div>
              );
            }

            if (element.type === 'text') {
              return (
                <TextComponentAdapter
                  key={element.id}
                  element={element as TextData}
                  selected={isSelected}
                  connecting={connecting}
                  connections={connections}
                  onSelect={() => selectElement(element.id)}
                  onUpdate={handleElementUpdate}
                  onDelete={handleElementDelete}
                  onConnectionStart={handleConnectionStart}
                />
              );
            }

            return null;
          })}
        </div>

        {/* Canvas Controls */}
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-2 flex gap-2">
          <button 
            onClick={() => setViewport(prev => ({ ...prev, zoom: Math.min(3, prev.zoom * 1.2) }))}
            className="p-2 hover:bg-gray-100 rounded text-gray-700"
          >
            +
          </button>
          <span className="p-2 text-sm text-gray-700">{Math.round(viewport.zoom * 100)}%</span>
          <button 
            onClick={() => setViewport(prev => ({ ...prev, zoom: Math.max(0.25, prev.zoom * 0.8) }))}
            className="p-2 hover:bg-gray-100 rounded text-gray-700"
          >
            -
          </button>
        </div>
      </div>

      {/* Context Menu */}
      <ContextMenu
        isOpen={contextMenuOpen}
        position={contextMenuPosition}
        targetElement={contextMenuTarget}
        targetElements={selectedElements}
        onClose={closeContextMenu}
        onDelete={handleElementDelete}
        onCopy={keyboardActions.copy}
        onPaste={keyboardActions.paste}
        onDuplicate={keyboardActions.duplicate}
      />

      {/* Content Details Panel */}
      <ContentDetailsPanel
        content={selectedContentForDetails}
        isOpen={contentDetailsPanelOpen}
        onClose={() => {
          setContentDetailsPanelOpen(false);
          setSelectedContentForDetails(null);
        }}
        onDelete={handleElementDelete}
      />

      {/* Canvas Toolbar */}
      <CanvasToolbar 
        onAddElement={handleAddElement}
        viewport={viewport}
      />

      {/* Interaction Tester */}
      <InteractionTester />
    </div>
  );
};