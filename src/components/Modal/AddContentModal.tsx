import React, { useState } from 'react';
import { Loader2, MessageSquare, Instagram, Video, Youtube, Sparkles, Plus, X } from 'lucide-react';
import { Platform, ContentElement } from '@/types';

interface AddContentModalProps {
  isOpen: boolean;
  selectedPlatform: Platform | null;
  onClose: () => void;
  onAdd: (contentData: Partial<ContentElement>) => void;
}

interface PlatformOption {
  id: Platform;
  name: string;
  icon: React.ReactNode;
}

const platforms: PlatformOption[] = [
  { id: 'instagram', name: 'Instagram posts', icon: <Instagram className="w-6 h-6 text-gray-600" /> },
  { id: 'unknown', name: 'Facebook posts & ads', icon: <MessageSquare className="w-6 h-6 text-gray-600" /> },
  { id: 'tiktok', name: 'TikTok posts', icon: <Video className="w-6 h-6 text-gray-600" /> },
  { id: 'youtube', name: 'YouTube videos/shorts', icon: <Youtube className="w-6 h-6 text-gray-600" /> },
  { id: 'unknown', name: 'Loom videos', icon: <Sparkles className="w-6 h-6 text-gray-600" /> },
  { id: 'unknown', name: 'Google Drive (Videos/PDFs)', icon: <Plus className="w-6 h-6 text-gray-600" /> },
  { id: 'unknown', name: 'X/Twitter posts', icon: <MessageSquare className="w-6 h-6 text-gray-600" /> }
];

/**
 * Modal for adding content to the canvas
 */
export const AddContentModal: React.FC<AddContentModalProps> = ({
  isOpen,
  selectedPlatform,
  onClose,
  onAdd
}) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!url.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        // If the response is not ok, it might be returning HTML (404, 500, etc.)
        const text = await response.text();
        console.error('API error response:', text);
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      // Check content-type to ensure it's JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('API returned non-JSON response');
      }

      const contentInfo = await response.json();
      
      if (contentInfo.error) {
        throw new Error(contentInfo.error);
      }

      onAdd({
        type: 'content',
        url,
        ...contentInfo,
        width: 300,
        height: 250
      });
      
      setUrl('');
      onClose();
    } catch (error) {
      console.error('Failed to fetch content:', error);
      
      // Try to detect platform from URL for better fallback
      let detectedPlatform = 'unknown';
      const lowerUrl = url.toLowerCase();
      if (lowerUrl.includes('instagram.com')) {
        detectedPlatform = 'instagram';
      } else if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
        detectedPlatform = 'youtube';
      } else if (lowerUrl.includes('tiktok.com')) {
        detectedPlatform = 'tiktok';
      }
      
      // Fallback to mock data with better platform detection
      onAdd({
        type: 'content',
        url,
        title: `${detectedPlatform.charAt(0).toUpperCase() + detectedPlatform.slice(1)} Content`,
        thumbnail: `https://via.placeholder.com/300x300?text=${detectedPlatform}`,
        platform: detectedPlatform as Platform,
        width: 300,
        height: 250
      });
      setUrl('');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark backdrop overlay */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl p-8 w-[600px] max-w-[90vw] shadow-2xl transform transition-all">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Add Content To Your Board</h2>
        
        {/* Platform Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {platforms.map((platform, index) => (
            <div
              key={`${platform.id}-${index}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              {platform.icon}
              <span className="text-gray-700">{platform.name}</span>
            </div>
          ))}
        </div>

        {/* URL Input */}
        <div className="mb-6">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Paste the link here or ctrl/cmd v on the board"
            className="w-full p-4 border-2 border-purple-300 rounded-lg focus:border-purple-500 outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-6 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!url.trim() || isLoading}
            className="flex-1 py-3 px-6 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Add Content
          </button>
        </div>
      </div>
    </div>
  );
};