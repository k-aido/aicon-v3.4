import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ContentSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddContent: (url: string, platform: string) => void;
}

export const ContentSelectionModal: React.FC<ContentSelectionModalProps> = ({
  isOpen,
  onClose,
  onAddContent
}) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const detectPlatformFromUrl = (url: string): string => {
    const cleanUrl = url.toLowerCase().trim();
    
    if (cleanUrl.includes('instagram.com')) return 'instagram';
    if (cleanUrl.includes('tiktok.com')) return 'tiktok';
    if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) return 'youtube';
    if (cleanUrl.includes('facebook.com') || cleanUrl.includes('fb.com')) return 'facebook';
    if (cleanUrl.includes('loom.com')) return 'loom';
    if (cleanUrl.includes('drive.google.com')) return 'drive';
    if (cleanUrl.includes('twitter.com') || cleanUrl.includes('x.com')) return 'twitter';
    if (cleanUrl.includes('linkedin.com')) return 'linkedin';
    if (cleanUrl.includes('snapchat.com')) return 'snapchat';
    
    // If no specific platform detected, categorize as profiles
    return 'profiles';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    try {
      const platform = detectPlatformFromUrl(url);
      await onAddContent(url, platform);
      
      // Reset form
      setUrl('');
      onClose();
    } catch (error) {
      console.error('Error adding content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Add Content To Your Board
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* URL Input Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste the link here or ctrl/cmd v on the board"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              required
              autoFocus
            />
          </div>

          {/* Add Content Button */}
          <button
            type="submit"
            disabled={!url.trim() || isLoading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Adding Content...
              </span>
            ) : (
              'Add Content'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};