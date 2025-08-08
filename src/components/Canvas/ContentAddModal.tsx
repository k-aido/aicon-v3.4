import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ContentAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (url: string, platform: string) => void;
  platform: string;
}

export const ContentAddModal: React.FC<ContentAddModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  platform
}) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const validateUrl = (inputUrl: string): boolean => {
    try {
      const urlObj = new URL(inputUrl);
      
      // Platform-specific validation
      switch (platform) {
        case 'youtube':
          return urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be');
        case 'instagram':
          return urlObj.hostname.includes('instagram.com');
        case 'tiktok':
          return urlObj.hostname.includes('tiktok.com');
        case 'profiles':
          // Accept any valid URL for profiles
          return true;
        default:
          return true;
      }
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    if (!validateUrl(url)) {
      setError(`Please enter a valid ${platform} URL`);
      return;
    }

    setIsLoading(true);
    try {
      // Call the onAdd callback with the URL and platform
      // The parent component will handle fetching metadata
      await onAdd(url, platform);
      setUrl('');
      onClose();
    } catch (err) {
      setError('Failed to add content. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getPlatformTitle = () => {
    switch (platform) {
      case 'youtube': return 'Add YouTube Content';
      case 'instagram': return 'Add Instagram Content';
      case 'tiktok': return 'Add TikTok Content';
      case 'profiles': return 'Add Profile';
      default: return 'Add Content';
    }
  };

  const getPlaceholder = () => {
    switch (platform) {
      case 'youtube': return 'https://www.youtube.com/watch?v=...';
      case 'instagram': return 'https://www.instagram.com/p/...';
      case 'tiktok': return 'https://www.tiktok.com/@username/video/...';
      case 'profiles': return 'https://example.com/profile';
      default: return 'https://...';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">{getPlatformTitle()}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
              Enter {platform} URL
            </label>
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={getPlaceholder()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Adding...' : 'Add to Canvas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};