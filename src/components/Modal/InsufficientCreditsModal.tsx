import React from 'react';
import { X, Zap, CreditCard, TrendingUp, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface InsufficientCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  creditsNeeded: number;
  creditsAvailable: number;
}

export const InsufficientCreditsModal: React.FC<InsufficientCreditsModalProps> = ({
  isOpen,
  onClose,
  creditsNeeded,
  creditsAvailable
}) => {
  const router = useRouter();

  if (!isOpen) return null;

  const handleUpgrade = () => {
    router.push('/billing');
    onClose();
  };

  const handleBuyCredits = () => {
    router.push('/billing?tab=credits');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-white">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Insufficient Credits</h2>
                <p className="text-white/90 text-sm mt-1">You need more credits to continue</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Credit Status */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Credits Required:</span>
                <span className="font-semibold text-lg">{creditsNeeded}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Your Balance:</span>
                <span className="font-semibold text-lg text-red-600">{creditsAvailable}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Credits Needed:</span>
                  <span className="font-bold text-lg text-orange-600">
                    {creditsNeeded - creditsAvailable}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {/* Upgrade Plan Option */}
            <button
              onClick={handleUpgrade}
              className="w-full p-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all transform hover:scale-[1.02] shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-semibold">Upgrade Your Plan</p>
                    <p className="text-xs text-purple-200">Get more monthly credits</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-purple-200">Starting from</p>
                  <p className="font-bold">$29/mo</p>
                </div>
              </div>
            </button>

            {/* Buy Credits Option */}
            <button
              onClick={handleBuyCredits}
              className="w-full p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all transform hover:scale-[1.02]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Zap className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">Buy Credit Pack</p>
                    <p className="text-xs text-gray-600">One-time purchase</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600">Starting from</p>
                  <p className="font-bold text-gray-900">$10</p>
                </div>
              </div>
            </button>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Did you know?</p>
                <p className="text-xs">
                  Each AI chat response uses 100 credits. Upgrade your plan for more monthly credits 
                  or purchase a credit pack for immediate access.
                </p>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                router.push('/dashboard');
                onClose();
              }}
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};