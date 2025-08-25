import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { LLM_MODELS, MODEL_CATEGORIES, getModelsByCategory, LLMModel } from '@/constants/llmModels';
import { getProviderLogo } from '@/components/icons/AIProviderLogos';
import { useDarkMode } from '@/contexts/DarkModeContext';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  className?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const modelsByCategory = getModelsByCategory();
  const currentModel = LLM_MODELS.find(m => m.id === selectedModel) || LLM_MODELS[0];
  const { isDarkMode } = useDarkMode();

  // Calculate dropdown position (drop up)
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Calculate height needed for dropdown (5 models + 2 category headers + padding)
      const dropdownHeight = 250;
      setDropdownPosition({
        top: rect.top + window.scrollY - dropdownHeight - 4, // 4px gap
        left: rect.left + window.scrollX
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (model: LLMModel) => {
    onModelChange(model.id);
    setIsOpen(false);
    console.log(`[ModelSelector] Selected model: ${model.id} (${model.provider})`);
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className={`h-8 flex items-center justify-between gap-2 px-3 border ${isDarkMode ? 'border-gray-600 hover:bg-gray-700 text-white' : 'border-gray-300 hover:bg-gray-100 text-gray-600'} rounded-lg text-sm outline-none cursor-pointer transition-colors ${className}`}
        data-no-drag
        style={{ pointerEvents: 'auto' }}
      >
        {/* Current model with logo */}
        <div className="flex items-center gap-2">
          {(currentModel.provider === 'openai' || currentModel.provider === 'anthropic') && (
            <>
              {React.createElement(getProviderLogo(currentModel.provider), {
                size: 10,
                className: currentModel.provider === 'anthropic' ? '' : 'text-gray-600'
              })}
            </>
          )}
          <span className={`whitespace-nowrap truncate ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>{currentModel.name}</span>
        </div>
        <ChevronDown className={`w-3 h-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown rendered with portal */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          ref={dropdownRef}
          className={`fixed w-[180px] ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-xl border overflow-hidden max-h-80 overflow-y-auto`}
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            zIndex: 9999,
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {(['low-cost', 'high-reasoning'] as const).map((category) => (
            <div key={category}>
              <div className={`px-3 py-1.5 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} border-b`}>
                <h3 className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {MODEL_CATEGORIES[category]}
                </h3>
              </div>
              {modelsByCategory[category]?.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleSelect(model)}
                  className={`w-full px-2 py-1 flex items-center justify-between ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* Logo */}
                    <div className="flex-shrink-0">
                      {React.createElement(getProviderLogo(model.provider), {
                        size: 10,
                        className: model.provider === 'anthropic' ? '' : 'text-gray-600'
                      })}
                    </div>
                    
                    {/* Model name */}
                    <span className={`text-xs font-medium whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>{model.name}</span>
                  </div>
                  
                  {selectedModel === model.id && (
                    <Check className="w-3 h-3 text-[#c96442] flex-shrink-0 ml-1" />
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
};