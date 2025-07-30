import React, { useState } from 'react';
import { MessageSquare, Instagram, Music2, Youtube, Globe, FolderPlus } from 'lucide-react';
import { ContentPiece, ChatData, FolderData } from '@/types/canvas';

interface Tool {
  id: string;
  icon: React.ComponentType<any>;
  label: string;
  color: string;
  type: 'chat' | 'content' | 'folder';
  platform?: string;
}

const tools: Tool[] = [
  { id: 'ai-chat', icon: MessageSquare, label: 'AI Chat', color: '#8B5CF6', type: 'chat' },
  { id: 'folder', icon: FolderPlus, label: 'Folder', color: '#059669', type: 'folder' },
  { id: 'youtube', icon: Youtube, label: 'YouTube', color: '#FF0000', type: 'content', platform: 'youtube' },
  { id: 'instagram', icon: Instagram, label: 'Instagram', color: '#E4405F', type: 'content', platform: 'instagram' },
  { id: 'tiktok', icon: Music2, label: 'TikTok', color: '#000000', type: 'content', platform: 'tiktok' },
  { id: 'website', icon: Globe, label: 'Website', color: '#3B82F6', type: 'content', platform: 'unknown' }
];

interface CanvasToolbarProps {
  onAddElement: (element: ContentPiece | ChatData | FolderData) => void;
  viewport: { x: number; y: number; zoom: number };
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({ onAddElement, viewport }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [draggingTool, setDraggingTool] = useState<Tool | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, tool: Tool) => {
    setDraggingTool(tool);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('tool', JSON.stringify(tool));
    
    // Create ghost image
    const dragImage = document.createElement('div');
    dragImage.className = 'bg-white rounded-lg shadow-lg p-3 flex items-center gap-2';
    dragImage.innerHTML = `<span style="color: ${tool.color}">${tool.label}</span>`;
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const handleDragEnd = () => {
    setDraggingTool(null);
  };

  const createElement = (tool: Tool, x: number, y: number) => {
    const id = `${tool.type}-${Date.now()}`;
    const baseElement = {
      id,
      position: { x, y },
      zIndex: tool.type === 'folder' ? 0 : tool.type === 'chat' ? 2 : 1,
      isVisible: true,
      isLocked: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (tool.type === 'chat') {
      return {
        ...baseElement,
        type: 'chat' as const,
        dimensions: { width: 800, height: 900 },
        title: 'New AI Chat',
        model: 'gpt-4',
        messages: [],
        connectedContentIds: [],
        status: 'idle' as const
      } as ChatData;
    }

    if (tool.type === 'folder') {
      return {
        ...baseElement,
        type: 'folder' as const,
        dimensions: { width: 350, height: 250 },
        name: 'New Folder',
        description: '',
        color: tool.color,
        childIds: [],
        isExpanded: true
      } as FolderData;
    }

    // Content piece
    return {
      ...baseElement,
      type: 'content' as const,
      dimensions: { width: 320, height: 240 },
      url: 'https://example.com',
      title: `New ${tool.label} Content`,
      thumbnail: `https://via.placeholder.com/320x240?text=${encodeURIComponent(tool.label)}&bg=${tool.color.slice(1)}&color=ffffff`,
      platform: tool.platform || 'unknown',
      viewCount: Math.floor(Math.random() * 100000),
      likeCount: Math.floor(Math.random() * 5000),
      commentCount: Math.floor(Math.random() * 500),
      tags: [tool.platform || 'content'].filter(Boolean)
    } as ContentPiece;
  };

  const handleToolClick = (tool: Tool) => {
    // Calculate center position accounting for viewport
    // Offset by half the element size to center it
    const halfWidth = tool.type === 'chat' ? 400 : 160;
    const halfHeight = tool.type === 'chat' ? 450 : 120;
    const centerX = (window.innerWidth / 2 - viewport.x) / viewport.zoom - halfWidth;
    const centerY = (window.innerHeight / 2 - viewport.y) / viewport.zoom - halfHeight;

    const newElement = createElement(tool, centerX, centerY);
    onAddElement(newElement);
    
    setActiveTool(tool.id);
    setTimeout(() => setActiveTool(null), 300);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const toolData = e.dataTransfer.getData('tool');
    if (!toolData) return;

    try {
      const tool = JSON.parse(toolData) as Tool;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      
      // Calculate drop position relative to viewport
      const x = (e.clientX - rect.left - viewport.x) / viewport.zoom;
      const y = (e.clientY - rect.top - viewport.y) / viewport.zoom;
      
      const newElement = createElement(tool, x - 160, y - 120);
      onAddElement(newElement);
    } catch (error) {
      console.error('Failed to create element from drop:', error);
    }
  };

  return (
    <div
      className={`fixed left-4 top-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl transition-all duration-200 ease-out z-30 ${
        isExpanded ? 'w-60' : 'w-16'
      }`}
      data-toolbar
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <div className="p-2">
        <div className="mb-2 px-3">
          <h3 className={`text-xs font-semibold text-gray-500 uppercase tracking-wide transition-all duration-200 ${
            isExpanded ? 'opacity-100' : 'opacity-0'
          }`}>
            Components
          </h3>
        </div>
        
        {tools.map((tool, index) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              draggable
              onDragStart={(e) => handleDragStart(e, tool)}
              onDragEnd={handleDragEnd}
              onClick={() => handleToolClick(tool)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 cursor-grab active:cursor-grabbing hover:scale-105 hover:shadow-md mb-1 outline-none focus:outline-none ${
                activeTool === tool.id ? 'scale-95' : ''
              } ${draggingTool?.id === tool.id ? 'opacity-50' : ''}`}
              style={{
                backgroundColor: activeTool === tool.id ? tool.color : 'transparent',
                color: activeTool === tool.id ? 'white' : '#374151'
              }}
              title={`${tool.label} - Click to add or drag to canvas`}
            >
              <div 
                className="flex-shrink-0 transition-colors duration-200"
                style={{ color: activeTool === tool.id ? 'white' : tool.color }}
              >
                <Icon className="w-6 h-6" />
              </div>
              <span 
                className={`text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                }`}
              >
                {tool.label}
              </span>
            </button>
          );
        })}
      </div>
      
      {/* Instructions */}
      <div className={`px-3 pb-3 transition-all duration-200 ${
        isExpanded ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="text-xs text-gray-400 border-t border-gray-100 pt-2">
          Click to add at center or drag to position
        </div>
      </div>
    </div>
  );
};