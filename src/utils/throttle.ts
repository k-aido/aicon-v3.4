/**
 * Throttles a function to limit its execution rate
 * @param func - The function to throttle
 * @param delay - The minimum delay between executions in milliseconds
 * @returns The throttled function
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        lastCall = Date.now();
        func(...args);
        timeout = null;
      }, delay - (now - lastCall));
    }
  };
};