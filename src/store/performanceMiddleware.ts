import { StateCreator, StoreMutatorIdentifier } from 'zustand';

interface PerformanceMetrics {
  actionName: string;
  duration: number;
  stateSize: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetrics = 100;
  
  recordMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }
  
  getMetrics() {
    return [...this.metrics];
  }
  
  getAverageActionTime(actionName: string) {
    const actionMetrics = this.metrics.filter(m => m.actionName === actionName);
    if (actionMetrics.length === 0) return 0;
    
    const totalTime = actionMetrics.reduce((sum, m) => sum + m.duration, 0);
    return totalTime / actionMetrics.length;
  }
  
  getSlowestActions(count = 10) {
    return [...this.metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, count);
  }
  
  logPerformanceSummary() {
    const actionTimes = new Map<string, number[]>();
    
    this.metrics.forEach(metric => {
      if (!actionTimes.has(metric.actionName)) {
        actionTimes.set(metric.actionName, []);
      }
      actionTimes.get(metric.actionName)!.push(metric.duration);
    });
    
    console.group('[Performance Summary]');
    actionTimes.forEach((times, action) => {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);
      const min = Math.min(...times);
      
      console.log(`${action}:`);
      console.log(`  Calls: ${times.length}`);
      console.log(`  Avg: ${avg.toFixed(2)}ms`);
      console.log(`  Min: ${min.toFixed(2)}ms`);
      console.log(`  Max: ${max.toFixed(2)}ms`);
    });
    console.groupEnd();
  }
}

const performanceMonitor = new PerformanceMonitor();

// Export for external use
export { performanceMonitor };

type PerformanceMiddleware = <
  T extends unknown,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
  stateCreator: StateCreator<T, Mps, Mcs>
) => StateCreator<T, Mps, Mcs>;

export const performanceMiddleware: PerformanceMiddleware = (config) => (set, get, api) => {
  const performanceSet = (partial: any, replace?: any) => {
    const startTime = performance.now();
    const stateBefore = get();
    
    // Determine action name
    let actionName = 'unknown';
    if (typeof partial === 'function') {
      actionName = partial.name || 'anonymous';
    } else if (partial && typeof partial === 'object') {
      actionName = 'setState';
    }
    
    // Execute the state update
    (set as any)(partial, replace);
    
    // Record metrics
    const endTime = performance.now();
    const duration = endTime - startTime;
    const stateAfter = get();
    const stateSize = JSON.stringify(stateAfter).length;
    
    performanceMonitor.recordMetric({
      actionName,
      duration,
      stateSize,
      timestamp: Date.now()
    });
    
    // Log slow operations
    if (duration > 16) { // Slower than one frame (60fps)
      console.warn(`[Performance] Slow action "${actionName}" took ${duration.toFixed(2)}ms`);
    }
  };
  
  return config(performanceSet as any, get, api);
};

// Debug utilities
export function logSlowActions() {
  const slowActions = performanceMonitor.getSlowestActions();
  console.table(slowActions);
}

export function logPerformanceSummary() {
  performanceMonitor.logPerformanceSummary();
}

// Auto-log performance summary in development
if (process.env.NODE_ENV === 'development') {
  // Log summary every 30 seconds
  setInterval(() => {
    performanceMonitor.logPerformanceSummary();
  }, 30000);
}

/**
 * Memory monitoring utilities
 */
export function getStoreMemoryUsage(storeName: string, state: any): number {
  try {
    const serialized = JSON.stringify(state);
    const sizeInBytes = new Blob([serialized]).size;
    const sizeInKB = sizeInBytes / 1024;
    const sizeInMB = sizeInKB / 1024;
    
    if (sizeInMB > 1) {
      console.warn(`[Memory] ${storeName} is using ${sizeInMB.toFixed(2)}MB of memory`);
    }
    
    return sizeInBytes;
  } catch (error) {
    console.error(`[Memory] Failed to calculate memory usage for ${storeName}:`, error);
    return 0;
  }
}

/**
 * Batch update helper for performance
 */
export class BatchUpdater<T> {
  private updates: T[] = [];
  private timeoutId: number | null = null;
  
  constructor(
    private applyUpdates: (updates: T[]) => void,
    private delay: number = 16 // Default to one frame
  ) {}
  
  add(update: T) {
    this.updates.push(update);
    this.scheduleFlush();
  }
  
  private scheduleFlush() {
    if (this.timeoutId !== null) return;
    
    this.timeoutId = window.setTimeout(() => {
      this.flush();
    }, this.delay);
  }
  
  flush() {
    if (this.updates.length === 0) return;
    
    const updates = [...this.updates];
    this.updates = [];
    
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    this.applyUpdates(updates);
  }
  
  clear() {
    this.updates = [];
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}