import React, { useState } from 'react';
import { 
  ZoomIn, ZoomOut, Maximize, Grid, Move, 
  MousePointer2, Hand, Plus, Menu, X
} from 'lucide-react';

interface MobileCanvasControlsProps {
  canvasMode: 'select' | 'pan' | 'connect';
  onModeChange: (mode: 'select' | 'pan' | 'connect') => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToContent: () => void;
  onToggleGrid: () => void;
  showGrid: boolean;
  zoom: number;
  onAddContent: () => void;
}

export const MobileCanvasControls: React.FC<MobileCanvasControlsProps> = ({
  canvasMode,
  onModeChange,
  onZoomIn,
  onZoomOut,
  onFitToContent,
  onToggleGrid,
  showGrid,
  zoom,
  onAddContent
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {/* Mobile FAB Menu */}
      <div className="fixed bottom-4 right-4 z-30 md:hidden">
        {/* Main FAB */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200"
        >
          {isExpanded ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Expanded Actions */}
        {isExpanded && (
          <div className="absolute bottom-16 right-0 space-y-2">
            {/* Add Content */}
            <button
              onClick={() => {
                onAddContent();
                setIsExpanded(false);
              }}
              className="w-12 h-12 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg flex items-center justify-center"
              title="Add Content"
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* Mode Toggle */}
            <button
              onClick={() => {
                onModeChange(canvasMode === 'select' ? 'pan' : 'select');
                setIsExpanded(false);
              }}
              className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center ${
                canvasMode === 'select' 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-orange-600 hover:bg-orange-700 text-white'
              }`}
              title={canvasMode === 'select' ? 'Switch to Pan' : 'Switch to Select'}
            >
              {canvasMode === 'select' ? <Hand className="w-5 h-5" /> : <MousePointer2 className="w-5 h-5" />}
            </button>

            {/* Fit to Content */}
            <button
              onClick={() => {
                onFitToContent();
                setIsExpanded(false);
              }}
              className="w-12 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg flex items-center justify-center"
              title="Fit to Content"
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Mobile Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20 md:hidden">
        <div className="flex items-center justify-between">
          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={onZoomOut}
              className="p-2 hover:bg-gray-100 rounded-lg"
              disabled={zoom <= 0.1}
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium min-w-[50px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={onZoomIn}
              className="p-2 hover:bg-gray-100 rounded-lg"
              disabled={zoom >= 3}
            >
              <ZoomIn className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Indicator */}
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              canvasMode === 'select' 
                ? 'bg-blue-100 text-blue-700' 
                : canvasMode === 'pan'
                ? 'bg-orange-100 text-orange-700'
                : 'bg-purple-100 text-purple-700'
            }`}>
              {canvasMode === 'select' && <><MousePointer2 className="w-3 h-3 inline mr-1" />Select</>}
              {canvasMode === 'pan' && <><Hand className="w-3 h-3 inline mr-1" />Pan</>}
              {canvasMode === 'connect' && <><Move className="w-3 h-3 inline mr-1" />Connect</>}
            </div>
          </div>

          {/* Grid Toggle */}
          <button
            onClick={onToggleGrid}
            className={`p-2 rounded-lg ${
              showGrid ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
            }`}
          >
            <Grid className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  );
};