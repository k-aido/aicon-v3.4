/**
 * Performance optimization utilities
 */

/**
 * Throttle function execution to limit calls within a timeframe
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;
  let lastResult: ReturnType<T> | undefined;
  
  return function executedFunction(...args: Parameters<T>) {
    lastArgs = args;
    
    if (!inThrottle) {
      lastResult = func(...lastArgs);
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          lastResult = func(...lastArgs);
        }
      }, limit);
    }
    
    return lastResult;
  };
}

/**
 * RequestAnimationFrame-based throttle for smooth animations
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    lastArgs = args;
    
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        if (lastArgs) {
          func(...lastArgs);
        }
        rafId = null;
      });
    }
  };
}

/**
 * Measure performance of a function
 */
export function measurePerformance<T extends (...args: any[]) => any>(
  func: T,
  label: string
): T {
  return ((...args: Parameters<T>) => {
    const start = performance.now();
    const result = func(...args);
    const end = performance.now();
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`);
    }
    
    return result;
  }) as T;
}

/**
 * Create a memoized selector with shallow comparison
 */
export function createSelector<T, R>(
  selector: (state: T) => R,
  equalityFn?: (a: R, b: R) => boolean
): (state: T) => R {
  let lastState: T | undefined;
  let lastResult: R | undefined;
  
  return (state: T) => {
    if (state === lastState) {
      return lastResult!;
    }
    
    const result = selector(state);
    
    if (lastResult !== undefined && equalityFn) {
      if (equalityFn(result, lastResult)) {
        return lastResult;
      }
    }
    
    lastState = state;
    lastResult = result;
    return result;
  };
}

/**
 * Batch multiple state updates for better performance
 */
export class UpdateBatcher<T> {
  private updates: T[] = [];
  private timeoutId: NodeJS.Timeout | null = null;
  
  constructor(
    private callback: (updates: T[]) => void,
    private delay: number = 0
  ) {}
  
  add(update: T) {
    this.updates.push(update);
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    if (this.delay === 0) {
      requestAnimationFrame(() => this.flush());
    } else {
      this.timeoutId = setTimeout(() => this.flush(), this.delay);
    }
  }
  
  flush() {
    if (this.updates.length > 0) {
      this.callback(this.updates);
      this.updates = [];
    }
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
  
  clear() {
    this.updates = [];
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}