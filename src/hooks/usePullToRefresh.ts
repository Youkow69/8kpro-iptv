import { useRef, useEffect, useState } from 'react';

export function usePullToRefresh(onRefresh: () => void | Promise<void>) {
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      // Allow pull-to-refresh when at top of page or scroll container
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      if (scrollTop <= 5) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current) return;
      const dy = e.touches[0].clientY - startY.current;
      // Cancel if scrolling up
      if (dy < 0) pulling.current = false;
    };

    const onTouchEnd = async (e: TouchEvent) => {
      if (!pulling.current || refreshing) return;
      pulling.current = false;
      const dy = e.changedTouches[0].clientY - startY.current;
      if (dy > 80) {
        setRefreshing(true);
        try { await onRefresh(); } catch {}
        setRefreshing(false);
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [onRefresh, refreshing]);

  return refreshing;
}
