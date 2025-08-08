import { useEffect, useRef, useState, useCallback } from 'react';

interface UseIntersectionObserverOptions {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
  freezeOnceVisible?: boolean;
}

interface IntersectionResult {
  isIntersecting: boolean;
  entry?: IntersectionObserverEntry;
}

/**
 * Hook for observing element intersection with viewport
 */
export function useIntersectionObserver<T extends Element>(
  options: UseIntersectionObserverOptions = {}
): [(element: T | null) => void, IntersectionResult] {
  const {
    root = null,
    rootMargin = '0px',
    threshold = 0,
    freezeOnceVisible = false
  } = options;

  const [element, setElement] = useState<T | null>(null);
  const [intersection, setIntersection] = useState<IntersectionResult>({
    isIntersecting: false
  });
  
  const frozen = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Callback ref for element
  const elementRef = useCallback((node: T | null) => {
    setElement(node);
  }, []);

  useEffect(() => {
    if (!element) return;

    // If frozen and already visible, don't create new observer
    if (frozen.current && intersection.isIntersecting) return;

    // Create observer
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        const isIntersecting = entry.isIntersecting;
        
        // Freeze if requested and becoming visible
        if (freezeOnceVisible && isIntersecting && !frozen.current) {
          frozen.current = true;
        }
        
        setIntersection({
          isIntersecting,
          entry
        });
      },
      {
        root,
        rootMargin,
        threshold
      }
    );

    // Start observing
    observerRef.current.observe(element);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [element, root, rootMargin, threshold, freezeOnceVisible, intersection.isIntersecting]);

  return [elementRef, intersection];
}

/**
 * Hook for observing multiple elements
 */
export function useMultipleIntersectionObserver(
  elements: Element[],
  options: UseIntersectionObserverOptions = {}
): Map<Element, boolean> {
  const {
    root = null,
    rootMargin = '0px',
    threshold = 0
  } = options;

  const [visibilityMap, setVisibilityMap] = useState<Map<Element, boolean>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (elements.length === 0) return;

    // Create observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        setVisibilityMap(prevMap => {
          const newMap = new Map(prevMap);
          
          entries.forEach(entry => {
            newMap.set(entry.target, entry.isIntersecting);
          });
          
          return newMap;
        });
      },
      {
        root,
        rootMargin,
        threshold
      }
    );

    // Observe all elements
    elements.forEach(element => {
      observerRef.current?.observe(element);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [elements, root, rootMargin, threshold]);

  return visibilityMap;
}

/**
 * Component wrapper for lazy loading with intersection observer
 */
interface LazyLoadProps {
  children: React.ReactNode;
  placeholder?: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
  className?: string;
}

export function LazyLoad({ 
  children, 
  placeholder = null,
  rootMargin = '100px',
  threshold = 0,
  className
}: LazyLoadProps) {
  const [ref, { isIntersecting }] = useIntersectionObserver<HTMLDivElement>({
    rootMargin,
    threshold,
    freezeOnceVisible: true
  });

  return (
    <div ref={ref} className={className}>
      {isIntersecting ? children : placeholder}
    </div>
  );
}