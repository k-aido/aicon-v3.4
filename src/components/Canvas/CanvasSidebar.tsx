import React, { useState } from 'react';
import { UserSearch } from 'lucide-react';
import { AIChatIcon, InstagramIcon, TikTokIcon, YouTubeIcon } from '@/components/icons/PngIcons';
import { useCanvasStore } from '@/store/canvasStore';

interface Tool {
  id: string;
  icon: React.ComponentType<any>;
  label: string;
  color: string;
  type: 'chat' | 'content' | 'creator-search';
  platform?: string;
}

const tools: Tool[] = [
  { id: 'ai-chat', icon: AIChatIcon, label: 'AI Chat', color: '#8B5CF6', type: 'chat' },
  { id: 'creator-search', icon: UserSearch, label: 'Search Creators', color: '#10B981', type: 'creator-search' },
  { id: 'instagram', icon: InstagramIcon, label: 'Instagram', color: '#E4405F', type: 'content', platform: 'instagram' },
  { id: 'tiktok', icon: TikTokIcon, label: 'TikTok', color: '#000000', type: 'content', platform: 'tiktok' },
  { id: 'youtube', icon: YouTubeIcon, label: 'YouTube', color: '#FF0000', type: 'content', platform: 'youtube' }
];

interface CanvasSidebarProps {
  onOpenSocialMediaModal?: (platform?: string) => void;
  onOpenCreatorSearch?: () => void;
}

export const CanvasSidebar: React.FC<CanvasSidebarProps> = ({ onOpenSocialMediaModal, onOpenCreatorSearch }) => {
  const [draggingTool, setDraggingTool] = useState<Tool | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);
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
    // Handle creator search
    if (tool.id === 'creator-search' && onOpenCreatorSearch) {
      onOpenCreatorSearch();
      setActiveTool(tool.id);
      setTimeout(() => setActiveTool(null), 300);
      return;
    }
    
    // Check if it's a social media platform and modal handler is available
    const socialMediaPlatforms = ['instagram', 'tiktok', 'youtube'];
    if (socialMediaPlatforms.includes(tool.id) && onOpenSocialMediaModal) {
      onOpenSocialMediaModal(tool.platform);
      setActiveTool(tool.id);
      setTimeout(() => setActiveTool(null), 300);
      return;
    }
    
    // Get canvas center position
    const canvasElement = document.querySelector('.canvas-background');
    if (!canvasElement) return;
    
    const rect = canvasElement.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Find next available ID - convert to numbers for Math.max, filter out non-numeric
    const numericIds = elements.map(el => typeof el.id === 'number' ? el.id : parseInt(String(el.id)) || 0);
    const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
    const newId = maxId + 1;
    
    // Create element based on type
    const baseElement = {
      id: newId,
      x: centerX - 150,
      y: centerY - 150,
      width: tool.type === 'chat' ? 600 : 300,
      height: tool.type === 'chat' ? 700 : 300,
      title: tool.label,
    };
    
    if (tool.type === 'chat') {
      const chatElement = {
        id: baseElement.id,
        type: 'chat' as const,
        position: { x: baseElement.x, y: baseElement.y },
        dimensions: { width: baseElement.width, height: baseElement.height },
        x: baseElement.x,        // Legacy compatibility
        y: baseElement.y,        // Legacy compatibility
        width: baseElement.width,  // Legacy compatibility
        height: baseElement.height, // Legacy compatibility
        title: baseElement.title,
        messages: [],
        conversations: [{
          id: 'default',
          title: 'New Conversation',
          messages: [],
          createdAt: new Date()
        }],
        // Additional required fields
        model: 'gpt-4',
        connectedContentIds: [],
        status: 'idle',
        zIndex: 2,
        isVisible: true,
        isLocked: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      addElement(chatElement);
    } else {
      // For non-chat, non-social media content types, create directly
      addElement({
        ...baseElement,
        type: 'content' as const,
        url: '',
        platform: tool.platform || 'instagram',
        thumbnail: `https://via.placeholder.com/300x200?text=${encodeURIComponent(tool.label)}`,
      });
    }
    
    setActiveTool(tool.id);
    setTimeout(() => setActiveTool(null), 300);
  };

  return (
    <div
      className="fixed left-4 top-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg z-30 p-1.5"
      data-toolbar
    >
      <div className="flex flex-col gap-1.5">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <div key={tool.id} className="relative">
              <button
                draggable
                onDragStart={(e) => handleDragStart(e, tool)}
                onDragEnd={handleDragEnd}
                onClick={() => handleToolClick(tool)}
                onMouseEnter={() => setHoveredTool(tool.id)}
                onMouseLeave={() => setHoveredTool(null)}
                className={`relative p-2.5 rounded-md transition-all duration-150 cursor-pointer hover:bg-gray-100 active:scale-95 ${
                  activeTool === tool.id ? 'bg-gray-100' : ''
                } ${draggingTool?.id === tool.id ? 'opacity-50' : ''}`}
              >
                <Icon className="w-6 h-6" size={24} style={{ color: tool.color }} />
              </button>
              
              {/* Tooltip */}
              {hoveredTool === tool.id && (
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 pointer-events-none z-50">
                  <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    {tool.label}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};