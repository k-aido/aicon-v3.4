'use client';

import React, { useState, useEffect } from 'react';
import { Coins, TrendingDown, RefreshCw } from 'lucide-react';
import { useDarkMode } from '@/contexts/DarkModeContext';

interface CreditBalance {
  total: number;
  promotional: number;
  monthly: number;
  monthlyAllocation: number;
}

export default function CreditCounter() {
  const [credits, setCredits] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isDarkMode } = useDarkMode();

  const fetchCredits = async () => {
    try {
      setError(null);
      const response = await fetch('/api/credits/balance');
      
      if (!response.ok) {
        throw new Error('Failed to fetch credit balance');
      }

      const data = await response.json();
      if (data.success) {
        setCredits(data.credits);
      } else {
        throw new Error(data.error || 'Failed to load credits');
      }
    } catch (err: any) {
      console.error('Error fetching credits:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCredits();

    // Refresh credits every 30 seconds
    const interval = setInterval(fetchCredits, 30000);

    // Also refresh when window regains focus
    const handleFocus = () => {
      fetchCredits();
    };
    window.addEventListener('focus', handleFocus);

    // Listen for custom credit update events
    const handleCreditUpdate = () => {
      fetchCredits();
    };
    window.addEventListener('creditUpdate', handleCreditUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('creditUpdate', handleCreditUpdate);
    };
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchCredits();
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getCreditsColor = () => {
    if (!credits) return 'text-gray-500';
    if (credits.total === 0) return 'text-red-500';
    if (credits.total < 100) return 'text-orange-500';
    if (credits.total < 500) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getCreditsBackground = () => {
    if (isDarkMode) return '#202a37';
    if (!credits) return 'bg-gray-50';
    if (credits.total === 0) return 'bg-red-50';
    if (credits.total < 100) return 'bg-orange-50';
    if (credits.total < 500) return 'bg-yellow-50';
    return 'bg-green-50';
  };

  if (loading && !credits) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg`} style={{ backgroundColor: isDarkMode ? '#202a37' : '#f9fafb' }}>
        <Coins className="h-4 w-4 text-gray-400 animate-pulse" />
        <span className="text-sm font-medium text-gray-400">Loading...</span>
      </div>
    );
  }

  if (error && !credits) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg`} style={{ backgroundColor: isDarkMode ? '#202a37' : '#fef2f2' }}>
        <Coins className="h-4 w-4 text-red-400" />
        <span className="text-sm font-medium text-red-600">Error</span>
      </div>
    );
  }

  return (
    <div 
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${!isDarkMode ? getCreditsBackground() : ''}`}
      style={isDarkMode ? { backgroundColor: '#202a37' } : {}}
    >
      <div className="flex items-center gap-2">
        <Coins className={`h-4 w-4 ${getCreditsColor()}`} />
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className={`text-sm font-semibold ${getCreditsColor()}`}>
              {credits ? formatNumber(credits.total) : '0'}
            </span>
            <span className="text-xs text-gray-500">credits</span>
          </div>
          {credits && credits.total < 100 && (
            <div className="flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-orange-400" />
              <span className="text-xs text-orange-600">Low balance</span>
            </div>
          )}
        </div>
      </div>
      
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="ml-1 p-1 hover:bg-white/50 rounded transition-colors"
        title="Refresh credit balance"
      >
        <RefreshCw 
          className={`h-3 w-3 text-gray-400 hover:text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} 
        />
      </button>

      {/* Tooltip on hover showing breakdown */}
      {credits && (
        <div className="group relative">
          <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
            <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 min-w-[200px]">
              <div className="font-semibold mb-1">Credit Breakdown</div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Monthly:</span>
                  <span>{formatNumber(credits.monthly)}</span>
                </div>
                {credits.promotional > 0 && (
                  <div className="flex justify-between">
                    <span>Promotional:</span>
                    <span>{formatNumber(credits.promotional)}</span>
                  </div>
                )}
                <div className="border-t border-gray-700 pt-1 mt-1">
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>{formatNumber(credits.total)}</span>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-[-6px] right-4 w-3 h-3 bg-gray-900 transform rotate-45"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}