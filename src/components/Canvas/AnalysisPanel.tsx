import React from 'react';
import { X } from 'lucide-react';
import { ContentElement } from '@/types';

interface AnalysisPanelProps {
  isOpen: boolean;
  content: ContentElement | null;
  onClose: () => void;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  isOpen,
  content,
  onClose
}) => {
  if (!content) return null;

  return (
    <div className={`fixed right-0 top-0 h-full bg-gray-900 shadow-2xl transition-transform duration-300 z-50 ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    } w-96 overflow-hidden`}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 p-4 flex items-center justify-between">
          <h2 className="text-white text-lg font-semibold">Content Analysis</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Thumbnail */}
          <div className="mb-4">
            <img 
              src={content.thumbnail} 
              alt={content.title}
              className="w-full h-48 object-cover rounded-lg"
            />
          </div>

          {/* Title */}
          <h3 className="text-white text-lg font-medium mb-4">{content.title}</h3>

          {/* Hook Section */}
          <div className="mb-6">
            <h4 className="text-gray-400 text-sm font-semibold uppercase tracking-wide mb-2">Hook</h4>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-300 text-sm">
                {content.metadata?.hookAnalysis || 'The opening captures attention with compelling visuals and immediately addresses the viewer\'s pain point.'}
              </p>
            </div>
          </div>

          {/* Body Section */}
          <div className="mb-6">
            <h4 className="text-gray-400 text-sm font-semibold uppercase tracking-wide mb-2">Body</h4>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-300 text-sm mb-3">
                {content.metadata?.bodyAnalysis || 'The main content provides valuable information with clear explanations and practical examples.'}
              </p>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• Clear structure and flow</li>
                <li>• Engaging visual elements</li>
                <li>• Educational value</li>
              </ul>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mb-6">
            <h4 className="text-gray-400 text-sm font-semibold uppercase tracking-wide mb-2">Call to Action</h4>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-300 text-sm">
                {content.metadata?.ctaAnalysis || 'Strong call-to-action encouraging engagement and follow-up actions.'}
              </p>
            </div>
          </div>

          {/* Metrics */}
          <div className="mb-6">
            <h4 className="text-gray-400 text-sm font-semibold uppercase tracking-wide mb-2">Performance</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-gray-400 text-xs">Platform</p>
                <p className="text-white text-sm font-medium capitalize">{content.platform}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-gray-400 text-xs">Status</p>
                <p className={`text-sm font-medium ${
                  content.metadata?.isAnalyzed ? 'text-green-400' : 
                  content.metadata?.isAnalyzing ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {content.metadata?.isAnalyzed ? 'Analyzed' : 
                   content.metadata?.isAnalyzing ? 'Analyzing' : 'Not Analyzed'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-gray-800 border-t border-gray-700">
          <button
            onClick={() => window.open(content.url, '_blank')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 px-4 flex items-center justify-center gap-2 transition-colors"
          >
            View Original
          </button>
        </div>
      </div>
    </div>
  );
};