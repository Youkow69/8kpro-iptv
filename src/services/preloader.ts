/**
 * Stream Pre-loader: Pre-caches adjacent channels for instant zapping (<1.5s)
 * Loads first 3 seconds of previous/next channel streams in hidden video elements
 */
import Hls from 'hls.js';
import mpegts from 'mpegts.js';

interface PreloadedStream {
  url: string;
  video: HTMLVideoElement;
  hls?: Hls;
  mpegtsPlayer?: mpegts.Player;
  ready: boolean;
}

class StreamPreloader {
  private cache = new Map<string, PreloadedStream>();
  private maxCached = 2; // prev + next

  preload(url: string): void {
    if (this.cache.has(url)) return;

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxCached) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.destroy(oldest);
    }

    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    // Keep video off-screen
    video.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;top:-9999px';
    document.body.appendChild(video);

    const entry: PreloadedStream = { url, video, ready: false };
    const isHls = url.includes('.m3u8');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 3,        // Only buffer 3 seconds
        maxMaxBufferLength: 5,
        maxBufferSize: 512 * 1024, // 512KB max
        startLevel: -1,            // Auto quality (start low)
      });
      entry.hls = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        entry.ready = true;
        // Start loading but don't play
        video.pause();
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) this.destroy(url);
      });
    } else if (url.includes('.ts') && mpegts.isSupported()) {
      const player = mpegts.createPlayer({
        type: 'mpegts',
        url,
        isLive: true,
      }, {
        enableWorker: true,
        enableStashBuffer: true,
        stashInitialSize: 64 * 1024, // Smaller buffer for preload
        liveBufferLatencyChasing: true,
        liveBufferLatencyMaxLatency: 3,
        liveBufferLatencyMinRemain: 1,
      });
      entry.mpegtsPlayer = player;
      player.attachMediaElement(video);
      player.load();
      // Don't play, just buffer
      video.addEventListener('canplay', () => {
        entry.ready = true;
        video.pause();
      }, { once: true });
    } else {
      video.src = url;
      video.addEventListener('canplay', () => {
        entry.ready = true;
        video.pause();
      }, { once: true });
    }

    this.cache.set(url, entry);
  }

  /**
   * Activate a preloaded stream: returns the video element if ready,
   * or null if not preloaded. Caller takes ownership of the video element.
   */
  activate(url: string): { video: HTMLVideoElement; hls?: Hls; mpegtsPlayer?: mpegts.Player } | null {
    const entry = this.cache.get(url);
    if (!entry || !entry.ready) return null;

    // Remove from cache without destroying
    this.cache.delete(url);
    return { video: entry.video, hls: entry.hls, mpegtsPlayer: entry.mpegtsPlayer };
  }

  isReady(url: string): boolean {
    return this.cache.get(url)?.ready ?? false;
  }

  destroy(url: string): void {
    const entry = this.cache.get(url);
    if (!entry) return;

    if (entry.hls) {
      entry.hls.destroy();
    }
    if (entry.mpegtsPlayer) {
      entry.mpegtsPlayer.destroy();
    }
    entry.video.src = '';
    entry.video.remove();
    this.cache.delete(url);
  }

  destroyAll(): void {
    for (const url of this.cache.keys()) {
      this.destroy(url);
    }
  }
}

// Singleton instance
export const streamPreloader = new StreamPreloader();
