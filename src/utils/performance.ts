/**
 * Performance utility functions for canvas optimization
 */

/**
 * Throttle function execution to improve performance
 * @param func Function to throttle
 * @param delay Delay in milliseconds
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    } else if (!timeout) {
      // Schedule a trailing call
      timeout = setTimeout(() => {
        lastCall = Date.now();
        func(...args);
        timeout = null;
      }, delay - (now - lastCall));
    }
  };
}

/**
 * Debounce function execution
 * @param func Function to debounce
 * @param delay Delay in milliseconds
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}

/**
 * Check if we should use reduced motion based on user preferences
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  return mediaQuery.matches;
}

/**
 * Get optimal render settings based on device capabilities
 */
export function getOptimalRenderSettings() {
  if (typeof window === 'undefined') {
    return {
      useWebGL: false,
      maxFPS: 60,
      reducedMotion: false
    };
  }

  // Check for reduced motion preference
  const reducedMotion = prefersReducedMotion();

  // Check WebGL support
  const canvas = document.createElement('canvas');
  const useWebGL = !!(
    canvas.getContext('webgl') || 
    canvas.getContext('experimental-webgl')
  );

  // Determine max FPS based on device
  const maxFPS = reducedMotion ? 30 : 60;

  return {
    useWebGL,
    maxFPS,
    reducedMotion
  };
}