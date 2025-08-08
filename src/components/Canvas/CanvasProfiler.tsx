import React, { Profiler, ProfilerOnRenderCallback, useCallback, useRef } from 'react';

interface PerformanceMetrics {
  id: string;
  phase: 'mount' | 'update' | 'nested-update';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
  interactions: Set<any>;
}

interface CanvasProfilerProps {
  children: React.ReactNode;
  id?: string;
  onRender?: (metrics: PerformanceMetrics) => void;
}

/**
 * Performance monitoring wrapper for Canvas components
 */
export const CanvasProfiler: React.FC<CanvasProfilerProps> = ({ 
  children, 
  id = 'Canvas',
  onRender 
}) => {
  const metricsRef = useRef<PerformanceMetrics[]>([]);
  const frameCountRef = useRef(0);
  const lastReportRef = useRef(Date.now());

  const handleRender = useCallback((
    profilerId: any,
    phase: any,
    actualDuration: any,
    baseDuration: any,
    startTime: any,
    commitTime: any,
    interactions: any,
    ...rest: any[]
  ) => {
    const metrics: PerformanceMetrics = {
      id: profilerId,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
      interactions
    };

    // Collect metrics
    metricsRef.current.push(metrics);
    frameCountRef.current++;

    // Custom callback
    onRender?.(metrics);

    // Report aggregate metrics every second in development
    if (process.env.NODE_ENV === 'development') {
      const now = Date.now();
      if (now - lastReportRef.current > 1000) {
        reportAggregateMetrics();
        lastReportRef.current = now;
      }
    }
  }, [onRender]);

  const reportAggregateMetrics = useCallback(() => {
    if (metricsRef.current.length === 0) return;

    const metrics = metricsRef.current;
    const avgActualDuration = metrics.reduce((sum, m) => sum + m.actualDuration, 0) / metrics.length;
    const maxActualDuration = Math.max(...metrics.map(m => m.actualDuration));
    const fps = frameCountRef.current;

    console.group(`[Performance] ${id} - Last Second`);
    console.log(`FPS: ${fps}`);
    console.log(`Avg Render Time: ${avgActualDuration.toFixed(2)}ms`);
    console.log(`Max Render Time: ${maxActualDuration.toFixed(2)}ms`);
    console.log(`Total Renders: ${metrics.length}`);
    console.log(`Mounts: ${metrics.filter(m => m.phase === 'mount').length}`);
    console.log(`Updates: ${metrics.filter(m => m.phase === 'update').length}`);
    console.groupEnd();

    // Reset metrics
    metricsRef.current = [];
    frameCountRef.current = 0;
  }, [id]);

  // Only wrap in Profiler in development
  if (process.env.NODE_ENV === 'production') {
    return <>{children}</>;
  }

  return (
    <Profiler id={id} onRender={handleRender as ProfilerOnRenderCallback}>
      {children}
    </Profiler>
  );
};

/**
 * Hook for tracking component render performance
 */
export function useRenderMetrics(componentName: string) {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(performance.now());

  renderCountRef.current++;

  if (process.env.NODE_ENV === 'development') {
    const now = performance.now();
    const timeSinceLastRender = now - lastRenderTimeRef.current;
    
    if (timeSinceLastRender < 16) { // Less than one frame (60fps)
      console.warn(
        `[Performance] ${componentName} rendered multiple times in one frame. ` +
        `Render count: ${renderCountRef.current}, Time since last: ${timeSinceLastRender.toFixed(2)}ms`
      );
    }
    
    lastRenderTimeRef.current = now;
  }
}

/**
 * Performance metrics display component
 */
export const PerformanceMonitor: React.FC<{ metrics: PerformanceMetrics[] }> = ({ metrics }) => {
  if (process.env.NODE_ENV === 'production' || metrics.length === 0) {
    return null;
  }

  const avgDuration = metrics.reduce((sum, m) => sum + m.actualDuration, 0) / metrics.length;
  const maxDuration = Math.max(...metrics.map(m => m.actualDuration));

  return (
    <div className="fixed bottom-4 left-4 bg-black bg-opacity-75 text-white text-xs p-3 rounded-lg space-y-1 font-mono">
      <div className="text-green-400">Performance Monitor</div>
      <div>Renders: {metrics.length}</div>
      <div>Avg: {avgDuration.toFixed(2)}ms</div>
      <div>Max: {maxDuration.toFixed(2)}ms</div>
      <div className={avgDuration > 16 ? 'text-red-400' : 'text-green-400'}>
        {avgDuration > 16 ? '⚠️ Slow renders detected' : '✓ Good performance'}
      </div>
    </div>
  );
};