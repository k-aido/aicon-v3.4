import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ProfileExtractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileAnalysis: (config: ProfileAnalysisConfig) => void;
}

interface ProfileAnalysisConfig {
  platform: 'youtube' | 'instagram' | 'tiktok';
  url: string;
  username: string;
  filterBy: 'latest' | 'likes' | 'comments' | 'views';
  amount: number;
}

type ModalStep = 'selection' | 'configuration';

const ProfileExtractionModal: React.FC<ProfileExtractionModalProps> = ({
  isOpen,
  onClose,
  onProfileAnalysis
}) => {
  const [currentStep, setCurrentStep] = useState<ModalStep>('selection');
  const [detectedPlatform, setDetectedPlatform] = useState<'youtube' | 'instagram' | 'tiktok' | null>(null);
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [filterBy, setFilterBy] = useState<'latest' | 'likes' | 'comments' | 'views'>('latest');
  const [amount, setAmount] = useState(10);
  const [urlError, setUrlError] = useState('');

  // Platform validation patterns
  const urlPatterns = {
    youtube: /^https?:\/\/(www\.)?(youtube\.com\/(channel\/|c\/|user\/|@)|youtu\.be\/)/,
    instagram: /^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._]+/,
    tiktok: /^https?:\/\/(www\.)?tiktok\.com\/@[a-zA-Z0-9._]+/
  };


  const extractUsernameFromUrl = (url: string, platform: string): string => {
    try {
      const urlObj = new URL(url);
      switch (platform) {
        case 'instagram':
          return urlObj.pathname.split('/')[1] || '';
        case 'tiktok':
          return urlObj.pathname.split('/')[1]?.replace('@', '') || '';
        case 'youtube':
          if (urlObj.pathname.includes('/@')) {
            return urlObj.pathname.split('/@')[1] || '';
          } else if (urlObj.pathname.includes('/c/')) {
            return urlObj.pathname.split('/c/')[1] || '';
          } else if (urlObj.pathname.includes('/channel/')) {
            return urlObj.pathname.split('/channel/')[1] || '';
          }
          return '';
        default:
          return '';
      }
    } catch {
      return '';
    }
  };

  const validateUrl = (url: string): 'youtube' | 'instagram' | 'tiktok' | null => {
    if (!url.trim()) {
      setUrlError('Please enter a profile URL');
      return null;
    }

    const platform = Object.entries(urlPatterns).find(([_, pattern]) => 
      pattern.test(url)
    )?.[0] as keyof typeof urlPatterns;

    if (!platform) {
      setUrlError('Please enter a valid YouTube, Instagram, or TikTok profile URL');
      return null;
    }

    setUrlError('');
    return platform;
  };

  const handleUrlSubmit = () => {
    const platform = validateUrl(url);
    if (!platform) {
      return;
    }

    const extractedUsername = extractUsernameFromUrl(url, platform);
    if (!extractedUsername) {
      setUrlError('Could not extract username from URL');
      return;
    }

    setDetectedPlatform(platform);
    setUsername(extractedUsername);
    setCurrentStep('configuration');
  };

  const handleAnalyze = () => {
    if (!detectedPlatform || !username) return;

    const config: ProfileAnalysisConfig = {
      platform: detectedPlatform,
      url,
      username,
      filterBy,
      amount
    };

    onProfileAnalysis(config);
    onClose();
    resetModal();
  };

  const resetModal = () => {
    setCurrentStep('selection');
    setDetectedPlatform(null);
    setUrl('');
    setUsername('');
    setFilterBy('latest');
    setAmount(10);
    setUrlError('');
  };

  const handleClose = () => {
    onClose();
    resetModal();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl">
        {currentStep === 'selection' ? (
          // STEP 1: Profile Selection Modal
          <>
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">
                Extract Best Videos From A Profile Link
              </h2>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* URL Input */}
              <div className="mb-6">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setUrlError('');
                  }}
                  placeholder="Paste the link here or ctrl/cmd v on the board"
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    urlError ? 'border-red-300' : 'border-gray-300'
                  }`}
                  autoFocus
                />
                {urlError && (
                  <p className="text-red-500 text-sm mt-2">{urlError}</p>
                )}
              </div>

              {/* Add Content Button */}
              <button
                onClick={handleUrlSubmit}
                disabled={!url.trim()}
                className="w-full bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add Content
              </button>
            </div>
          </>
        ) : (
          // STEP 2: Profile Analysis Configuration Modal
          <>
            {/* Dark Purple Header */}
            <div className="bg-purple-600 text-white p-4 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium">
                  {detectedPlatform && detectedPlatform.charAt(0).toUpperCase() + detectedPlatform.slice(1)} {username}
                </h2>
                <button
                  onClick={handleClose}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Configuration Content */}
            <div className="p-6">
              {/* Filter By Dropdown */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by:
                </label>
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value as any)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="latest">Latest</option>
                  <option value="likes">Likes</option>
                  <option value="comments">Comments</option>
                  <option value="views">Views</option>
                </select>
              </div>

              {/* Amount Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount of videos:
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Math.max(1, Math.min(50, parseInt(e.target.value) || 10)))}
                  min="1"
                  max="50"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Analyze Button */}
              <button
                onClick={handleAnalyze}
                className="w-full bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors"
              >
                Analyze
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProfileExtractionModal;