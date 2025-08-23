import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { LLM_MODELS, MODEL_CATEGORIES, getModelsByCategory, LLMModel } from '@/constants/llmModels';
import { getProviderLogo } from '@/components/icons/AIProviderLogos';

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
        className={`w-[136px] h-[25px] flex items-center justify-between gap-2 px-2 py-0 bg-gray-100 rounded-lg text-xs border border-gray-200 outline-none hover:bg-gray-50 focus:border-[#1e8bff] cursor-pointer ${className}`}
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
          <span className="text-gray-700 whitespace-nowrap truncate">{currentModel.name}</span>
        </div>
        <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown rendered with portal */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed w-[180px] bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden max-h-80 overflow-y-auto"
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
              <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200">
                <h3 className="text-xs font-semibold text-gray-600">
                  {MODEL_CATEGORIES[category]}
                </h3>
              </div>
              {modelsByCategory[category]?.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleSelect(model)}
                  className="w-full px-2 py-1 flex items-center justify-between"
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
                    <span className="text-xs text-gray-700 font-medium whitespace-nowrap">{model.name}</span>
                  </div>
                  
                  {selectedModel === model.id && (
                    <Check className="w-3 h-3 text-[#1e8bff] flex-shrink-0 ml-1" />
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