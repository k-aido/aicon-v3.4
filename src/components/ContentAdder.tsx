import React, { useState } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { detectPlatform } from '@/utils/platform';
import { Plus, Youtube, Instagram, MessageSquare, X } from 'lucide-react';

interface ContentAdderProps {
  onClose?: () => void;
}

const ContentAdder: React.FC<ContentAdderProps> = ({ onClose }) => {
  const [url, setUrl] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [contentType, setContentType] = useState<'url' | 'chat'>('url');
  const { addElement, elements } = useCanvasStore();

  const extractVideoId = (url: string, platform: string): string => {
    if (platform === 'youtube') {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
      return match ? match[1] : '';
    }
    return '';
  };

  const generateId = (): number => {
    // Convert mixed ID types to numbers for Math.max
    const numericIds = elements.map(el => typeof el.id === 'number' ? el.id : parseInt(String(el.id)) || 0);
    return numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
  };

  const handleAddContent = () => {
    if (contentType === 'url' && url.trim()) {
      const platform = detectPlatform(url);
      const videoId = extractVideoId(url, platform);
      
      const newElement = {
        id: generateId(),
        type: 'content' as const,
        x: Math.random() * 400 + 100, // Random position
        y: Math.random() * 300 + 100,
        width: 300,
        height: 200,
        title: platform === 'youtube' ? 'YouTube Video' : 
               platform === 'instagram' ? 'Instagram Post' : 
               'Content',
        url: url.trim(),
        platform,
        thumbnail: platform === 'youtube' && videoId ? 
          `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : undefined
      };

      addElement(newElement);
      setUrl('');
      setIsOpen(false);
      onClose?.();
    } else if (contentType === 'chat') {
      const newElement = {
        id: generateId(),
        type: 'chat' as const,
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100,
        width: 350,
        height: 400,
        title: 'AI Chat',
        messages: [],
        conversations: []
      };

      addElement(newElement);
      setIsOpen(false);
      onClose?.();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setUrl('');
    onClose?.();
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-colors z-50"
        title="Add Content"
      >
        <Plus size={24} />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Add Content</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-4">
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => setContentType('url')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${
                contentType === 'url' 
                  ? 'bg-blue-50 border-blue-300 text-blue-700' 
                  : 'bg-gray-50 border-gray-300 text-gray-700'
              }`}
            >
              <Youtube size={16} />
              <span>URL Content</span>
            </button>
            <button
              onClick={() => setContentType('chat')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${
                contentType === 'chat' 
                  ? 'bg-blue-50 border-blue-300 text-blue-700' 
                  : 'bg-gray-50 border-gray-300 text-gray-700'
              }`}
            >
              <MessageSquare size={16} />
              <span>AI Chat</span>
            </button>
          </div>

          {contentType === 'url' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=... or https://instagram.com/p/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <div className="mt-2 flex items-center space-x-2 text-sm text-gray-600">
                <Youtube size={16} className="text-red-500" />
                <Instagram size={16} className="text-pink-500" />
                <span>Supports YouTube, Instagram, TikTok</span>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Add an AI chat interface to analyze and discuss your content.
              </p>
            </div>
          )}
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAddContent}
            disabled={contentType === 'url' && !url.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add to Canvas
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContentAdder;