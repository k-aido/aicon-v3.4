import React, { useState } from 'react';
import { MessageSquare, Instagram, Music2, Youtube, Globe } from 'lucide-react';
import { useCanvasStore } from '@/store/canvasStore';

interface Tool {
  id: string;
  icon: React.ComponentType<any>;
  label: string;
  color: string;
  type: 'chat' | 'content';
  platform?: string;
}

const tools: Tool[] = [
  { id: 'ai-chat', icon: MessageSquare, label: 'AI Chat', color: '#8B5CF6', type: 'chat' },
  { id: 'instagram', icon: Instagram, label: 'Instagram', color: '#E4405F', type: 'content', platform: 'instagram' },
  { id: 'tiktok', icon: Music2, label: 'TikTok', color: '#000000', type: 'content', platform: 'tiktok' },
  { id: 'youtube', icon: Youtube, label: 'YouTube', color: '#FF0000', type: 'content', platform: 'youtube' },
  { id: 'website', icon: Globe, label: 'Website URL', color: '#3B82F6', type: 'content', platform: 'website' }
];

export const CanvasSidebar: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [draggingTool, setDraggingTool] = useState<Tool | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const { addElement, elements } = useCanvasStore();

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

  const handleToolClick = (tool: Tool) => {
    // Get canvas center position
    const canvasElement = document.querySelector('.canvas-background');
    if (!canvasElement) return;

    const rect = canvasElement.getBoundingClientRect();
    const centerX = rect.width / 2 - 150; // Subtract half of element width
    const centerY = rect.height / 2 - 100; // Subtract half of element height

    // Create new element at center
    const newElement = {
      id: Date.now(),
      type: tool.type as 'chat' | 'content',
      x: centerX,
      y: centerY,
      width: tool.type === 'chat' ? 320 : 300,
      height: tool.type === 'chat' ? 400 : 350,
      platform: tool.platform,
      title: tool.type === 'chat' ? 'AI Chat' : `New ${tool.label} Content`,
      url: tool.type === 'content' ? 'https://example.com' : undefined,
      thumbnail: tool.type === 'content' ? 'https://via.placeholder.com/300x200' : undefined,
      messages: tool.type === 'chat' ? [] : undefined
    };

    addElement(newElement);
    setActiveTool(tool.id);
    setTimeout(() => setActiveTool(null), 300);
  };

  return (
    <div
      className={`fixed left-4 top-1/2 -translate-y-1/2 bg-white rounded-xl shadow-lg transition-all duration-200 ease-out z-40 ${
        isExpanded ? 'w-60' : 'w-16'
      }`}
      data-sidebar
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="p-2">
        {tools.map((tool, index) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              draggable
              onDragStart={(e) => handleDragStart(e, tool)}
              onDragEnd={handleDragEnd}
              onClick={() => handleToolClick(tool)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 cursor-grab active:cursor-grabbing hover:scale-105 hover:shadow-md outline-none focus:outline-none ${
                activeTool === tool.id ? 'scale-95' : ''
              } ${draggingTool?.id === tool.id ? 'opacity-50' : ''}`}
              style={{
                backgroundColor: activeTool === tool.id ? tool.color : 'transparent',
                color: activeTool === tool.id ? 'white' : '#374151'
              }}
              title={tool.label}
            >
              <div 
                className={`flex-shrink-0 transition-colors duration-200`}
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
    </div>
  );
};