import { useEffect, useRef, useCallback, useState } from 'react';

export function useInfiniteScroll(totalItems: number, batchSize = 50) {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const reset = useCallback(() => setVisibleCount(batchSize), [batchSize]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((c) => Math.min(c + batchSize, totalItems));
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [totalItems, batchSize]);

  return { visibleCount, reset, sentinelRef, hasMore: visibleCount < totalItems };
}
