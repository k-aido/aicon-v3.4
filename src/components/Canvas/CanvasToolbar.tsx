import React, { useState } from 'react';
import { Globe, UserSearch, Folder, MessageSquare, Instagram, Video, Youtube } from 'lucide-react';
import { ContentPiece, ChatData, FolderData } from '@/types/canvas';

// Generate truly unique string IDs for canvas elements
let toolIdCounter = 0;
const generateUniqueToolId = () => {
  const timestamp = Date.now();
  toolIdCounter = (toolIdCounter + 1) % 10000;
  return `${timestamp}-${toolIdCounter}`;
};

interface Tool {
  id: string;
  icon: React.ComponentType<any>;
  label: string;
  color: string;
  type: 'chat' | 'content' | 'folder' | 'creator-search';
  platform?: string;
}

// COLLECTIONS DISABLED VERSION 3.0 - COMING SOON ONLY
console.log('🚨 COLLECTIONS DISABLED v3.0 - Should not create folders!');

const tools: Tool[] = [
  { id: 'ai-chat', icon: MessageSquare, label: 'AI Chat', color: '#8B5CF6', type: 'chat' },
  { id: 'collections', icon: Folder, label: 'Collections - DISABLED', color: '#F59E0B', type: 'folder' },
  { id: 'creator-search', icon: UserSearch, label: 'Search Creators', color: '#10B981', type: 'creator-search' },
  { id: 'instagram', icon: Instagram, label: 'Instagram', color: '#E4405F', type: 'content', platform: 'instagram' },
  { id: 'tiktok', icon: Video, label: 'TikTok', color: '#000000', type: 'content', platform: 'tiktok' },
  { id: 'youtube', icon: Youtube, label: 'YouTube', color: '#FF0000', type: 'content', platform: 'youtube' },
  { id: 'website', icon: Globe, label: 'Website URL', color: '#3B82F6', type: 'content', platform: 'unknown' }
];

interface CanvasToolbarProps {
  onAddElement: (element: ContentPiece | ChatData | FolderData) => void;
  viewport: { x: number; y: number; zoom: number };
  onOpenSocialMediaModal?: (platform?: string) => void;
  onOpenCreatorSearch?: () => void;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({ onAddElement, viewport, onOpenSocialMediaModal, onOpenCreatorSearch }) => {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);


  const createElement = (tool: Tool, x: number, y: number) => {
    // Generate string ID to match CanvasWorkspace pattern
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    const stringId = `${tool.type}-${timestamp}-${random}`; // Use descriptive string ID
    
    if (tool.type === 'chat') {
      const chatElement = {
        id: stringId,
        type: 'chat' as const,
        position: { x: x, y: y },
        dimensions: { width: 600, height: 700 },
        x: x,        // Legacy compatibility
        y: y,        // Legacy compatibility
        width: 600,  // Legacy compatibility
        height: 700, // Legacy compatibility
        title: 'New AI Chat',
        messages: [],
        conversations: [],
        // Optional fields for compatibility
        model: 'gpt-4',
        connectedContentIds: [],
        status: 'idle' as const,
        zIndex: 2,
        isVisible: true,
        isLocked: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      console.log('💬 [CanvasToolbar] Creating AI Chat element (fixed format):', { chatElement });
      return chatElement;
    }

    if (tool.type === 'folder') {
      return {
        id: stringId,
        type: 'folder' as const,
        position: { x: x, y: y },
        dimensions: { width: 350, height: 250 },
        x: x,
        y: y,
        width: 350,
        height: 250,
        name: 'New Collection',
        description: '',
        color: tool.color,
        childIds: [],
        isExpanded: true,
        zIndex: 1,
        isVisible: true,
        isLocked: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    // Content piece
    return {
      id: stringId,
      type: 'content' as const,
      position: { x: x, y: y },
      dimensions: { width: 320, height: 240 },
      x: x,
      y: y,
      width: 320,
      height: 240,
      url: 'https://example.com',
      title: `New ${tool.label} Content`,
      thumbnail: `https://via.placeholder.com/320x240?text=${encodeURIComponent(tool.label)}&bg=${tool.color.slice(1)}&color=ffffff`,
      platform: (tool.platform || 'unknown') as any,
      viewCount: Math.floor(Math.random() * 100000),
      likeCount: Math.floor(Math.random() * 5000),
      commentCount: Math.floor(Math.random() * 500),
      tags: [tool.platform || 'content'].filter(Boolean),
      zIndex: 1,
      isVisible: true,
      isLocked: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  };

  const handleToolClick = (tool: Tool) => {
    console.log('🔨 [CanvasToolbar] Tool clicked:', tool.id, tool.type);
    
    // Handle collections - coming soon (do nothing)
    if (tool.id === 'collections') {
      console.log('📁 [CanvasToolbar] Collections clicked - Coming Soon!');
      alert('Collections feature is coming soon!');
      setActiveTool(tool.id);
      setTimeout(() => setActiveTool(null), 300);
      return;
    }
    
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
      return;
    }
    
    // Simple fixed position for debugging
    const x = 100;
    const y = 100;

    const newElement = createElement(tool, x, y);
    console.log('🔨 [CanvasToolbar] Tool clicked - created element:', { toolId: tool.id, toolType: tool.type, toolPlatform: tool.platform, newElement });
    console.log('🔨 [CanvasToolbar] Element dimensions:', (newElement as any).dimensions);
    console.log('🔨 [CanvasToolbar] About to call onAddElement with:', newElement);
    
    onAddElement(newElement);
    
    setActiveTool(tool.id);
    setTimeout(() => setActiveTool(null), 300);
  };


  return (
    <div
      className="fixed left-4 top-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg z-30 p-1"
      data-toolbar
    >
      <div className="flex flex-col gap-1">
        {tools.map((tool, index) => {
          const Icon = tool.icon;
          return (
            <div key={tool.id} className="relative">
              <button
                draggable={false}
                onClick={() => handleToolClick(tool)}
                onMouseEnter={() => setHoveredTool(tool.id)}
                onMouseLeave={() => setHoveredTool(null)}
                className={`relative p-2 rounded-md transition-all duration-150 cursor-pointer hover:bg-gray-100 active:scale-95 ${
                  activeTool === tool.id ? 'bg-gray-100' : ''
                }`}
              >
                <Icon className="w-5 h-5" size={20} style={{ color: tool.color }} />
              </button>
              
              {/* Tooltip */}
              {hoveredTool === tool.id && (
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 pointer-events-none z-50">
                  <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    {tool.id === 'collections' ? (
                      <div className="text-center">
                        <div>Collections</div>
                        <div className="text-gray-300 text-xs">Coming Soon</div>
                      </div>
                    ) : (
                      tool.label
                    )}
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