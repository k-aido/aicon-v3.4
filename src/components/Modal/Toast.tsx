'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

export default function Toast({ 
  id, 
  type, 
  title, 
  message, 
  duration = 5000, 
  onClose 
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Animate in
    setIsVisible(true);

    // Auto close
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose(id);
    }, 300); // Match animation duration
  };

  const typeConfig = {
    success: {
      icon: CheckCircle,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    error: {
      icon: XCircle,
      iconColor: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    info: {
      icon: Info,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    }
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        bg-white border rounded-lg shadow-lg p-4 min-w-80 max-w-md
        ${config.borderColor}
      `}
    >
      <div className="flex items-start">
        {/* Icon */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${config.bgColor}`}>
          <Icon className={`h-4 w-4 ${config.iconColor}`} />
        </div>
        
        {/* Content */}
        <div className="ml-3 flex-1">
          <h4 className="text-sm font-semibold text-gray-900">
            {title}
          </h4>
          {message && (
            <p className="text-sm text-gray-600 mt-1">
              {message}
            </p>
          )}
        </div>
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="flex-shrink-0 ml-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}