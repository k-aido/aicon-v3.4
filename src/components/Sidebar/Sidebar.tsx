import React from 'react';
import { MessageSquare, Sparkles, Plus, Youtube, Instagram, Video } from 'lucide-react';
import { Platform } from '@/types';

interface SidebarProps {
  onAddContent: (platform: Platform) => void;
  onAddChat: () => void;
}

interface SidebarButtonProps {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}

const SidebarButton: React.FC<SidebarButtonProps> = ({ onClick, title, children }) => (
  <button
    onClick={onClick}
    className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors group outline-none focus:outline-none"
    title={title}
  >
    {children}
  </button>
);

/**
 * Sidebar component with tools for adding elements to the canvas
 */
export const Sidebar: React.FC<SidebarProps> = React.memo(({ onAddContent, onAddChat }) => {
  return (
    <div className="w-16 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-4 gap-4" data-sidebar>
      {/* AI Chat */}
      <SidebarButton onClick={onAddChat} title="Add AI Chat">
        <div className="relative">
          <MessageSquare className="w-6 h-6 text-purple-400 group-hover:text-purple-300" />
          <Sparkles className="w-3 h-3 text-purple-400 absolute -top-1 -right-1" />
        </div>
      </SidebarButton>

      {/* Separator */}
      <div className="w-10 h-px bg-gray-700" />

      {/* Social Content */}
      <div className="flex flex-col gap-2">
        <SidebarButton onClick={() => onAddContent('youtube')} title="Add YouTube">
          <Youtube className="w-6 h-6 text-red-500" />
        </SidebarButton>
        
        <SidebarButton onClick={() => onAddContent('instagram')} title="Add Instagram">
          <Instagram className="w-6 h-6 text-pink-500" />
        </SidebarButton>
        
        <SidebarButton onClick={() => onAddContent('tiktok')} title="Add TikTok">
          <Video className="w-6 h-6 text-white" />
        </SidebarButton>
        
        <SidebarButton onClick={() => onAddContent('unknown')} title="Add Content">
          <Plus className="w-6 h-6 text-gray-400" />
        </SidebarButton>
      </div>
    </div>
  );
});