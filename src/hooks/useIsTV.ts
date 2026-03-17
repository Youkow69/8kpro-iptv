import { useState, useEffect } from 'react';

/**
 * Detect if running on a TV (Android TV, Fire TV, etc.)
 * Checks user-agent + screen heuristics + Capacitor platform
 */
export function useIsTV(): boolean {
  const [isTV, setIsTV] = useState(() => detectTV());
  useEffect(() => { setIsTV(detectTV()); }, []);
  return isTV;
}

function detectTV(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();

  // Android TV / Fire TV / Smart TV user-agent patterns
  if (
    ua.includes('android tv') ||
    ua.includes('aftm') ||    // Fire TV Stick
    ua.includes('aftt') ||    // Fire TV Stick 4K
    ua.includes('aftb') ||    // Fire TV
    ua.includes('afts') ||    // Fire TV Stick Lite
    ua.includes('aftjmst') || // Fire TV Stick 4K Max
    ua.includes('aftka') ||   // Fire TV Cube
    ua.includes('smart-tv') ||
    ua.includes('smarttv') ||
    ua.includes('googletv') ||
    ua.includes('crkey') ||   // Chromecast
    ua.includes('tizen') ||   // Samsung TV
    ua.includes('webos') ||   // LG TV
    ua.includes('h96') ||     // H96 boxes
    ua.includes('tv box') ||
    ua.includes('amlogic') ||
    ua.includes('allwinner') ||
    ua.includes('rockchip')
  ) {
    return true;
  }

  // Heuristic: landscape with no touch support → likely TV
  const noTouch = !('ontouchstart' in window) && navigator.maxTouchPoints === 0;
  const bigScreen = window.screen.width >= 1280;
  if (noTouch && bigScreen && ua.includes('android')) {
    return true;
  }

  return false;
}

// Global helper (non-hook) for use outside React
export function isTVDevice(): boolean {
  return detectTV();
}
