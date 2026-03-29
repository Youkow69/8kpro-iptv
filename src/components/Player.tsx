import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import mpegts from 'mpegts.js';
import {
  X, Maximize, Minimize, Loader2, AlertCircle,
  List, ChevronUp, ChevronDown, Volume2, VolumeX,
  PictureInPicture2, Search, Star, RefreshCw,
} from 'lucide-react';
import { useIptvStore } from '../store/iptvStore';
import { useAuthStore } from '../store/authStore';
import { buildLiveStreamUrl, getOriginalUrlFromProxy, proxyStreamUrl } from '../services/xtreamApi';
import { useTranslation } from '../i18n/useTranslation';
import { useIsTV } from '../hooks/useIsTV';
import { playChannelUp, playChannelDown, playClick, playFavoriteAdd, playFavoriteRemove } from '../services/sounds';
import DragonBallAura from './DragonBallAura';
import ChannelLogo from './ChannelLogo';

export default function Player() {
  const {
    playerUrl, playerTitle, playerStreamId, playerMode,
    closePlayer, openPlayer,
    liveStreams, liveCategories, selectedLiveCategory,
    setLastChannel, favorites, toggleFavorite,
  } = useIptvStore();
  const credentials = useAuthStore((s) => s.credentials);
  const { t } = useTranslation();
  const isTV = useIsTV();

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const mpegtsRef = useRef<mpegts.Player | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const retryCountRef = useRef(0);
  const watchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isReconnectRef = useRef(false); // true = silent reconnect, don't show spinner
  const maxRetries = 3;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showChannelList, setShowChannelList] = useState(false);
  const [channelSearch, setChannelSearch] = useState('');
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('8k_player_volume');
    return saved ? parseFloat(saved) : 1;
  });

  const controlsTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // Persist volume changes and sync to video element
  useEffect(() => {
    localStorage.setItem('8k_player_volume', String(volume));
    if (videoRef.current) videoRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const iconSize = isTV ? 'w-7 h-7' : 'w-5 h-5';
  const btnPad = isTV ? 'p-3' : 'p-2';

  // Auto-hide controls
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      if (!showChannelList) setShowControls(false);
    }, isTV ? 5000 : 3000);
  }, [showChannelList, isTV]);

  useEffect(() => {
    const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFs);
    return () => document.removeEventListener('fullscreenchange', handleFs);
  }, []);

  // Cleanup players helper - pause first to prevent AbortError spam
  const cleanupPlayers = useCallback(() => {
    if (watchdogRef.current) { clearInterval(watchdogRef.current); watchdogRef.current = null; }
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.muted = true; // Prevent audio bleed during cleanup
    }
    if (hlsRef.current) {
      try { hlsRef.current.destroy(); } catch {}
      hlsRef.current = null;
    }
    if (mpegtsRef.current) {
      try {
        mpegtsRef.current.pause();
        mpegtsRef.current.unload();
        mpegtsRef.current.detachMediaElement();
        mpegtsRef.current.destroy();
      } catch {}
      mpegtsRef.current = null;
    }
    if (video) {
      video.removeAttribute('src');
      try { video.load(); } catch {}
      video.muted = muted; // Restore mute state
    }
  }, [muted]);

  // Retry logic - reload the stream, not the page
  const retryStream = useCallback(() => {
    if (!playerUrl || !videoRef.current) return;
    retryCountRef.current = 0;
    setLoading(true);
    setError('');
    cleanupPlayers();
    // Force re-render by updating playerUrl effect
    setTimeout(() => window.location.reload(), 300);
  }, [playerUrl, cleanupPlayers]);

  // Main stream loader
  const loadStream = useCallback((url: string, video: HTMLVideoElement) => {
    const isHls = url.includes('.m3u8');
    const isMpegTs = url.includes('.ts') && !url.includes('.m3u8');
    // All streams go through proxy (same behavior on web + APK)
    if (isHls && Hls.isSupported()) {
      // Proxy already rewrites m3u8 segment URLs - no xhrSetup needed
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 8,
        maxMaxBufferLength: 20,
        maxBufferHole: 1.5,
        fragLoadingMaxRetry: 10,
        fragLoadingRetryDelay: 300,
        manifestLoadingMaxRetry: 6,
        manifestLoadingRetryDelay: 300,
        levelLoadingMaxRetry: 6,
        startFragPrefetch: true,
        backBufferLength: 5,
        liveSyncDurationCount: 1,
        liveMaxLatencyDurationCount: 5,
        startLevel: -1,
        progressive: true,
        maxStarvationDelay: 2,
        maxLoadingDelay: 2,
      });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);

      let hlsStarted = false;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        hlsStarted = true;
        setLoading(false);
        retryCountRef.current = 0;
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            if (retryCountRef.current < 8) {
              // More retries for HLS - each segment can fail independently
              hls.startLoad();
              retryCountRef.current++;
            } else {
              // Fully reconnect after too many segment failures
              setLoading(true);
              try { hls.destroy(); } catch {}
              hlsRef.current = null;
              retryCountRef.current = 0;
              setTimeout(() => {
                if (videoRef.current) loadStream(url, videoRef.current);
              }, 1000);
            }
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            setLoading(false);
            setError(t('player.error.fatal'));
          }
        }
      });

      // HLS watchdog - reconnect if video stops progressing
      let hlsLastTime = 0;
      let hlsStallCount = 0;
      if (watchdogRef.current) clearInterval(watchdogRef.current);
      watchdogRef.current = setInterval(() => {
        if (!hlsStarted) return;
        const now = video.currentTime;
        if (now === hlsLastTime && !video.paused) {
          hlsStallCount++;
          if (hlsStallCount >= 4) { // 20s no progress -> full reconnect
            hlsStallCount = 0;
            setLoading(true);
            try { hls.destroy(); } catch {}
            hlsRef.current = null;
            retryCountRef.current = 0;
            setTimeout(() => {
              if (videoRef.current) loadStream(url, videoRef.current);
            }, 500);
          }
        } else {
          hlsStallCount = 0;
        }
        hlsLastTime = now;
      }, 5000);

      // Handle rebuffering for HLS too
      video.addEventListener('waiting', () => { if (hlsStarted) setLoading(true); });
      video.addEventListener('playing', () => { setLoading(false); setError(''); });
    } else if (isMpegTs && mpegts.isSupported()) {
      void isReconnectRef.current; // was isSilent
      isReconnectRef.current = false; // Reset for next time

      const player = mpegts.createPlayer({
        type: 'mpegts',
        url: url,
        isLive: true,
      }, {
        enableWorker: true,
        enableStashBuffer: true,
        stashInitialSize: 128 * 1024,
        liveBufferLatencyChasing: false,
        autoCleanupSourceBuffer: true,
        autoCleanupMaxBackwardDuration: 30,
        autoCleanupMinBackwardDuration: 15,
        fixAudioTimestampGap: true,
        seekType: 'range',
      });
      mpegtsRef.current = player;
      player.attachMediaElement(video);
      player.load();

      let hasStarted = false; // Only true after canplay fires

      // If mpegts.js can't start in 12s, try fallbacks:
      // 1) Native .ts (handles HEVC via hardware decoder)
      // 2) HLS .m3u8 via hls.js (handles streams mpegts.js can't parse)
      const loadTimeout = setTimeout(() => {
        if (!hasStarted) {
          clearInterval(playNudge);
          try { player.pause(); player.unload(); player.detachMediaElement(); player.destroy(); } catch {}
          mpegtsRef.current = null;

          // Fallback 1: native video.src with .ts (HEVC hardware decode)
          video.src = url;
          let nativeTimeout: ReturnType<typeof setTimeout>;
          const onNativeCanplay = () => {
            clearTimeout(nativeTimeout);
            setLoading(false);
            video.play().catch(() => {});
          };
          const tryHlsFallback = () => {
            video.removeEventListener('canplay', onNativeCanplay);
            video.removeAttribute('src');
            try { video.load(); } catch {}
            // Fallback 2: HLS .m3u8
            const originalUrl = getOriginalUrlFromProxy(url);
            const hlsUrl = originalUrl
              ? proxyStreamUrl(originalUrl.replace(/\.ts$/, '.m3u8'))
              : url.replace(/\.ts$/, '.m3u8');
            if (Hls.isSupported()) {
              const hlsFallback = new Hls({
                enableWorker: true,
                maxBufferLength: 10,
                fragLoadingMaxRetry: 6,
                manifestLoadingMaxRetry: 4,
                liveSyncDurationCount: 1,
              });
              hlsRef.current = hlsFallback;
              hlsFallback.loadSource(hlsUrl);
              hlsFallback.attachMedia(video);
              hlsFallback.on(Hls.Events.MANIFEST_PARSED, () => {
                setLoading(false);
                video.play().catch(() => {});
              });
              hlsFallback.on(Hls.Events.ERROR, (_e, data) => {
                if (data.fatal) {
                  setLoading(false);
                  setError(t('player.error.network'));
                }
              });
            } else {
              // Safari: native HLS
              video.src = hlsUrl;
              video.addEventListener('canplay', () => { setLoading(false); video.play().catch(() => {}); }, { once: true });
              video.addEventListener('error', () => { setLoading(false); setError(t('player.error.network')); }, { once: true });
              video.play().catch(() => {});
            }
          };
          video.addEventListener('canplay', onNativeCanplay, { once: true });
          video.addEventListener('error', tryHlsFallback, { once: true });
          // Give native 8s to start, else try HLS
          nativeTimeout = setTimeout(() => {
            if (video.readyState < 3) tryHlsFallback();
          }, 8000);
          video.play().catch(() => {});
        }
      }, 12000); // 12s then start fallback chain

      // Periodically try play() while loading - some streams need a nudge
      const playNudge = setInterval(() => {
        if (hasStarted) { clearInterval(playNudge); return; }
        if (video.readyState >= 2) {
          video.play().catch(() => {});
        }
      }, 2000);

      // Silent reconnect for real failures only
      let reconnecting = false;
      const silentReconnect = () => {
        if (reconnecting) return;
        reconnecting = true;
        clearInterval(playNudge);
        try { player.pause(); player.unload(); player.detachMediaElement(); player.destroy(); } catch {}
        mpegtsRef.current = null;
        clearTimeout(loadTimeout);
        isReconnectRef.current = true;
        setTimeout(() => {
          if (videoRef.current) {
            reconnecting = false;
            loadStream(url, videoRef.current);
          }
        }, 500);
      };

      // Watchdog: reconnect if video stops progressing for 10s
      let lastTime = 0;
      let stallCount = 0;
      if (watchdogRef.current) clearInterval(watchdogRef.current);
      watchdogRef.current = setInterval(() => {
        if (!hasStarted || reconnecting) return;
        const now = video.currentTime;
        if (now === lastTime && !video.paused) {
          stallCount++;
          if (stallCount >= 2) { // 10s no progress -> reconnect
            stallCount = 0;
            silentReconnect();
          }
        } else {
          stallCount = 0;
        }
        lastTime = now;
      }, 5000);

      // Handle fatal errors
      player.on(mpegts.Events.ERROR, () => {
        if (hasStarted && !reconnecting) silentReconnect();
      });

      // Stream ended -> reconnect
      video.addEventListener('ended', () => {
        if (hasStarted) silentReconnect();
      });

      video.addEventListener('canplay', () => {
        hasStarted = true;
        clearTimeout(loadTimeout);
        clearInterval(playNudge);
        retryCountRef.current = 0;
        setLoading(false);
        video.play().catch(() => {});
      });

      video.addEventListener('playing', () => {
        hasStarted = true;
        clearTimeout(loadTimeout);
        retryCountRef.current = 0;
        setLoading(false);
        setError('');
      }, { once: true });

      // Once started, NEVER show loading spinner again - just freeze on last frame
      const onWaiting = () => {}; // Do nothing - no spinner
      const onPlaying = () => { setLoading(false); setError(''); };
      const onStalled = () => {
        // If stalled for 5s after start, try seeking slightly forward
        if (hasStarted && video.buffered.length > 0) {
          setTimeout(() => {
            if (video.paused || video.readyState < 3) {
              const end = video.buffered.end(video.buffered.length - 1);
              if (end > video.currentTime + 0.5) {
                video.currentTime = end - 0.3;
              }
              video.play().catch(() => {});
            }
          }, 3000);
        }
      };
      video.addEventListener('waiting', onWaiting);
      video.addEventListener('playing', onPlaying);
      video.addEventListener('stalled', onStalled);

      player.play();
    } else {
      // Fallback: native
      video.src = url;
      video.addEventListener('canplay', () => {
        setLoading(false);
        retryCountRef.current = 0;
        video.play().catch(() => {});
      }, { once: true });
      video.addEventListener('error', () => {
        setLoading(false);
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          setTimeout(() => loadStream(url, video), 1500);
        } else {
          setError(t('player.error.network'));
        }
      }, { once: true });
      video.play().catch(() => {});
    }
  }, [t, cleanupPlayers]);

  // Keyboard / D-pad shortcuts
  useEffect(() => {
    if (!playerUrl) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case 'Escape':
        case 'Backspace':
          if (showChannelList) setShowChannelList(false);
          else closePlayer();
          e.preventDefault();
          break;
        case 'm':
        case 'M':
          setMuted((m) => {
            if (videoRef.current) videoRef.current.muted = !m;
            return !m;
          });
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case 'c':
        case 'C':
          setShowChannelList((s) => !s);
          break;
        case 'ArrowUp':
          if (!showChannelList && playerMode === 'live') {
            e.preventDefault();
            navigateChannel(-1);
          }
          break;
        case 'ArrowDown':
          if (!showChannelList && playerMode === 'live') {
            e.preventDefault();
            navigateChannel(1);
          }
          break;
        case 'ArrowLeft':
          if (isTV) resetControlsTimer();
          // Volume down
          if (!isTV && videoRef.current) {
            const newVol = Math.max(0, volume - 0.1);
            videoRef.current.volume = newVol;
            setVolume(newVol);
          }
          break;
        case 'ArrowRight':
          if (isTV && playerMode === 'live') setShowChannelList((s) => !s);
          // Volume up
          if (!isTV && videoRef.current) {
            const newVol = Math.min(1, volume + 0.1);
            videoRef.current.volume = newVol;
            setVolume(newVol);
          }
          break;
        case 'Enter':
          if (isTV && videoRef.current) {
            if (videoRef.current.paused) videoRef.current.play().catch(() => {});
            else videoRef.current.pause();
            e.preventDefault();
          }
          break;
        case ' ':
          e.preventDefault();
          if (videoRef.current) {
            if (videoRef.current.paused) videoRef.current.play().catch(() => {});
            else videoRef.current.pause();
          }
          break;
      }
      resetControlsTimer();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [playerUrl, playerMode, playerStreamId, liveStreams, showChannelList, isTV, volume]);

  // Load video source
  useEffect(() => {
    if (!playerUrl || !videoRef.current) return;

    retryCountRef.current = 0;
    setLoading(true);
    setError('');
    setShowControls(false);

    cleanupPlayers();

    // Small delay lets browser release old resources before loading new stream
    const timer = setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.volume = volume;
        videoRef.current.muted = muted;
        loadStream(playerUrl, videoRef.current);
      }
    }, 150);

    // Pre-cache disabled - saves bandwidth and speeds up current stream loading

    return () => {
      clearTimeout(timer);
      cleanupPlayers();
    };
  }, [playerUrl]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch {}
  };

  const navigateChannel = (direction: number) => {
    if (!credentials || !playerStreamId || liveStreams.length === 0) return;
    const idx = liveStreams.findIndex((s) => s.stream_id === playerStreamId);
    if (idx === -1) return;
    const nextIdx = (idx + direction + liveStreams.length) % liveStreams.length;
    const next = liveStreams[nextIdx];
    direction > 0 ? playChannelDown() : playChannelUp();
    setLastChannel(next.stream_id);
    const url = buildLiveStreamUrl(credentials, next.stream_id);
    openPlayer(url, next.name, next.stream_id, 'live');
  };

  const switchToChannel = (stream: typeof liveStreams[0]) => {
    if (!credentials) return;
    playClick();
    setLastChannel(stream.stream_id);
    const url = buildLiveStreamUrl(credentials, stream.stream_id);
    openPlayer(url, stream.name, stream.stream_id, 'live');
    setShowChannelList(false);
  };

  // Swipe gestures for mobile channel switching (must be before early return)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  if (!playerUrl) return null;

  const isLive = playerMode === 'live';
  const filteredChannels = liveStreams.filter((s) =>
    s.name.toLowerCase().includes(channelSearch.toLowerCase())
  );

  const currentCategory = liveCategories.find((c) => c.category_id === selectedLiveCategory);

  // Channel number display
  const currentIdx = liveStreams.findIndex((s) => s.stream_id === playerStreamId);
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || 'ontouchstart' in window;

  const handleTouchStart = (e: React.TouchEvent) => {
    resetControlsTimer();
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !isLive) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;
    if (dt > 500 || Math.abs(dx) > Math.abs(dy)) return; // Too slow or horizontal
    if (Math.abs(dy) > 60) { // Vertical swipe
      navigateChannel(dy < 0 ? -1 : 1); // Swipe up = prev, swipe down = next
    }
    touchStartRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black flex flex-col"
      onMouseMove={resetControlsTimer}
      onClick={resetControlsTimer}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-30 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${
          isTV ? 'px-6 py-4' : 'px-4 py-3'
        } ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {isLive && (
            <span className={`shrink-0 flex items-center gap-1.5 bg-red-600 text-white font-bold px-2.5 py-1 rounded-md uppercase tracking-wide ${
              isTV ? 'text-sm' : 'text-[10px]'
            }`}>
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              {t('player.live')}
            </span>
          )}
          {currentIdx >= 0 && (
            <span className={`text-white/50 font-mono ${isTV ? 'text-sm' : 'text-xs'}`}>
              {currentIdx + 1}/{liveStreams.length}
            </span>
          )}
          <h3 className={`text-white font-medium truncate ${isTV ? 'text-lg' : 'text-sm'}`}>{playerTitle}</h3>
          {isLive && currentCategory && (
            <span className={`hidden sm:inline text-white/40 truncate ${isTV ? 'text-sm' : 'text-xs'}`}>
              {currentCategory.category_name}
            </span>
          )}
        </div>
        <div className={`flex items-center ${isTV ? 'gap-2' : 'gap-1'}`}>
          {isLive && (
            <>
              <button
                onClick={() => navigateChannel(-1)}
                className={`${btnPad} text-white/70 hover:text-white hover:bg-white/10 focus-visible:text-white focus-visible:bg-white/10 rounded-lg transition`}
                title={t('player.prev')}
                aria-label={t('player.prev')}
              >
                <ChevronUp className={iconSize} />
              </button>
              <button
                onClick={() => navigateChannel(1)}
                className={`${btnPad} text-white/70 hover:text-white hover:bg-white/10 focus-visible:text-white focus-visible:bg-white/10 rounded-lg transition`}
                title={t('player.next')}
                aria-label={t('player.next')}
              >
                <ChevronDown className={iconSize} />
              </button>
              <button
                onClick={() => setShowChannelList((s) => !s)}
                className={`${btnPad} rounded-lg transition ${
                  showChannelList ? 'text-accent bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/10 focus-visible:text-white focus-visible:bg-white/10'
                }`}
                title={t('player.channelList')}
                aria-label={t('player.channelList')}
              >
                <List className={iconSize} />
              </button>
            </>
          )}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setMuted((m) => {
                if (videoRef.current) videoRef.current.muted = !m;
                return !m;
              });
            }}
            className={`${isMobile ? 'p-3' : btnPad} rounded-lg transition ${
              muted
                ? 'text-red-400 bg-red-400/15'
                : 'text-white/70 hover:text-white hover:bg-white/10 focus-visible:text-white focus-visible:bg-white/10'
            }`}
            title={t('player.mute')}
            aria-label={t('player.mute')}
          >
            {muted ? <VolumeX className={isMobile ? 'w-6 h-6' : iconSize} /> : <Volume2 className={isMobile ? 'w-6 h-6' : iconSize} />}
          </button>
          {!isTV && (
            <button
              onClick={togglePiP}
              className={`${btnPad} text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition`}
              title={t('player.pip') || 'Picture-in-Picture'}
              aria-label={t('player.pip') || 'Picture-in-Picture'}
            >
              <PictureInPicture2 className={iconSize} />
            </button>
          )}
          <button
            onClick={toggleFullscreen}
            className={`${btnPad} text-white/70 hover:text-white hover:bg-white/10 focus-visible:text-white focus-visible:bg-white/10 rounded-lg transition`}
            title={t('player.fullscreen')}
            aria-label={t('player.fullscreen')}
          >
            {isFullscreen ? <Minimize className={iconSize} /> : <Maximize className={iconSize} />}
          </button>
          <button
            onClick={closePlayer}
            className={`${btnPad} text-white/70 hover:text-white hover:bg-white/10 focus-visible:text-white focus-visible:bg-white/10 rounded-lg transition`}
            title={t('player.close')}
            aria-label={t('player.close')}
          >
            <X className={iconSize} />
          </button>
        </div>
      </div>

      {/* TV overlay hint */}
      {isTV && showControls && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-6 glass rounded-2xl px-8 py-4 text-white/60 text-sm animate-fade-in">
          <span className="flex items-center gap-1.5"><span className="text-accent">▲▼</span> {t('player.channels')}</span>
          <span className="flex items-center gap-1.5"><span className="text-accent">◀</span> {t('vod.back')}</span>
          <span className="flex items-center gap-1.5"><span className="text-accent">▶</span> {t('player.channelList')}</span>
          <span className="flex items-center gap-1.5"><span className="text-accent">OK</span> {t('settings.key.playPause')}</span>
        </div>
      )}

      {/* Video */}
      <div className="flex-1 flex items-center justify-center relative">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 bg-black/60 backdrop-blur-sm">
            <div className="relative">
              <Loader2 className={`text-accent animate-spin ${isTV ? 'w-16 h-16' : 'w-12 h-12'}`} />
              <div className="absolute inset-0 rounded-full bg-accent/10 animate-ping" />
            </div>
            <div className="text-center">
              <p className={`text-white/80 font-medium ${isTV ? 'text-lg' : 'text-base'}`}>{t('player.loading')}</p>
              <p className="text-white/40 text-xs mt-1">{t('player.loading')}</p>
            </div>
            {retryCountRef.current > 0 && (
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full">
                <RefreshCw className="w-3 h-3 text-accent animate-spin" />
                <p className="text-white/50 text-xs">{retryCountRef.current}/{maxRetries}</p>
              </div>
            )}
          </div>
        )}
        {error && (
          <div className={`absolute bottom-20 left-1/2 -translate-x-1/2 bg-red-500/20 border border-red-500/40 backdrop-blur-sm text-red-300 rounded-xl px-5 py-3 flex items-center gap-3 z-10 max-w-lg ${
            isTV ? 'text-base' : 'text-sm'
          }`}>
            <AlertCircle className={`shrink-0 ${isTV ? 'w-6 h-6' : 'w-5 h-5'}`} />
            <p className="flex-1">{error}</p>
            <button
              onClick={retryStream}
              className="shrink-0 flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition text-white text-xs font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {t('player.retry') || 'Retry'}
            </button>
          </div>
        )}
        <video
          ref={videoRef}
          controls={false}
          autoPlay
          preload="auto"
          className="w-full h-full bg-black object-contain"
          muted={muted}
          playsInline
        />
      </div>

      {/* VOD progress bar */}
      {!isLive && showControls && videoRef.current && (
        <div className="absolute bottom-0 left-0 right-0 z-30">
          <div
            className="h-1 bg-white/20 cursor-pointer group"
            onClick={(e) => {
              if (!videoRef.current || !videoRef.current.duration) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              videoRef.current.currentTime = pct * videoRef.current.duration;
            }}
          >
            <div
              className="h-full bg-accent group-hover:h-1.5 transition-all"
              style={{ width: `${videoRef.current.duration ? (videoRef.current.currentTime / videoRef.current.duration) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Volume bar - desktop only (mobile volume is OS-controlled) */}
      {showControls && !isTV && !isMobile && (
        <div className="absolute bottom-16 left-4 z-30 flex flex-col items-center gap-1 glass rounded-full px-1.5 py-2">
          <div
            className="w-3 h-24 bg-white/20 rounded-full overflow-hidden relative cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = 1 - (e.clientY - rect.top) / rect.height;
              const newVol = Math.max(0, Math.min(1, pct));
              setVolume(newVol);
              if (videoRef.current) videoRef.current.volume = newVol;
              if (newVol > 0 && muted) {
                setMuted(false);
                if (videoRef.current) videoRef.current.muted = false;
              }
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              const bar = e.currentTarget;
              const onMove = (ev: MouseEvent) => {
                const rect = bar.getBoundingClientRect();
                const pct = 1 - (ev.clientY - rect.top) / rect.height;
                const newVol = Math.max(0, Math.min(1, pct));
                setVolume(newVol);
                if (videoRef.current) videoRef.current.volume = newVol;
              };
              const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
              };
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }}
          >
            <div
              className="absolute bottom-0 left-0 right-0 bg-accent rounded-full transition-[height] duration-75"
              style={{ height: `${volume * 100}%` }}
            />
            <div
              className="absolute left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md border-2 border-accent"
              style={{ bottom: `calc(${volume * 100}% - 7px)` }}
            />
          </div>
          <span className="text-white/50 text-[10px]">{Math.round(volume * 100)}%</span>
        </div>
      )}

      {/* Muted indicator - mobile */}
      {showControls && isMobile && muted && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-full px-4 py-2">
          <VolumeX className="w-5 h-5 text-red-400" />
          <span className="text-red-400 text-sm font-medium">Muet</span>
        </div>
      )}

      {/* Channel list sidebar */}
      {isLive && showChannelList && (
        <div className={`absolute top-0 right-0 bottom-0 bg-surface/95 backdrop-blur-xl z-40 flex flex-col border-l border-surface-lighter shadow-2xl animate-slide-in-right ${
          isTV ? 'w-96 max-w-[85vw]' : 'w-80 max-w-[85vw]'
        }`}>
          <div className={`border-b border-surface-lighter ${isTV ? 'p-4' : 'p-3'}`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className={`text-text-primary font-semibold ${isTV ? 'text-base' : 'text-sm'}`}>{t('player.channels')}</h4>
              <div className="flex items-center gap-2">
                <span className="text-text-secondary text-xs">{filteredChannels.length} ch.</span>
                <button
                  onClick={() => setShowChannelList(false)}
                  className={`text-text-secondary hover:text-text-primary focus-visible:text-text-primary transition ${isTV ? 'p-2' : 'p-1'}`}
                >
                  <X className={isTV ? 'w-5 h-5' : 'w-4 h-4'} />
                </button>
              </div>
            </div>
            <div className="relative">
              <Search className={`absolute top-1/2 -translate-y-1/2 text-text-secondary ${
                isTV ? 'left-3 w-4 h-4' : 'left-2.5 w-3.5 h-3.5'
              }`} />
              <input
                type="text"
                placeholder={t('player.searchChannels')}
                value={channelSearch}
                onChange={(e) => setChannelSearch(e.target.value)}
                className={`w-full bg-surface-light border border-surface-lighter rounded-lg text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent transition ${
                  isTV ? 'pl-9 pr-4 py-2.5 text-sm' : 'pl-8 pr-3 py-1.5 text-xs'
                }`}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredChannels.map((stream, i) => {
              const isActive = stream.stream_id === playerStreamId;
              const isFav = favorites.includes(stream.stream_id);
              return (
                <button
                  key={stream.stream_id}
                  onClick={() => switchToChannel(stream)}
                  className={`w-full flex items-center text-left transition group ${
                    isTV ? 'gap-3 px-4 py-3.5' : 'gap-2.5 px-3 py-2.5'
                  } ${
                    isActive
                      ? 'bg-accent/15 border-l-2 border-accent'
                      : 'hover:bg-surface-light focus-visible:bg-surface-light border-l-2 border-transparent'
                  }`}
                >
                  <span className={`text-text-secondary/50 font-mono shrink-0 ${isTV ? 'text-xs w-8' : 'text-[10px] w-6'}`}>
                    {i + 1}
                  </span>
                  <div className={`relative shrink-0 ${isTV ? 'w-10 h-10' : 'w-8 h-8'}`}>
                    <DragonBallAura streamId={stream.stream_id} size="xs" />
                    <div className={`relative z-[1] rounded-md flex items-center justify-center overflow-hidden ${
                      isTV ? 'w-10 h-10' : 'w-8 h-8'
                    }`}>
                      <ChannelLogo name={stream.name} size="sm" />
                    </div>
                  </div>
                  <span className={`flex-1 truncate ${
                    isTV ? 'text-sm' : 'text-xs'
                  } ${
                    isActive ? 'text-accent font-semibold' : 'text-text-primary group-hover:text-accent group-focus-visible:text-accent'
                  }`}>
                    {stream.name}
                  </span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse shrink-0" />
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); const wasFav = favorites.includes(stream.stream_id); wasFav ? playFavoriteRemove() : playFavoriteAdd(); toggleFavorite(stream.stream_id); }}
                    className={`rounded transition shrink-0 ${
                      isTV ? 'p-2' : 'p-1'
                    } ${
                      isFav ? 'text-yellow-400' : 'text-white/20 hover:text-yellow-400 focus-visible:text-yellow-400 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
                    }`}
                  >
                    <Star className={`${isTV ? 'w-4 h-4' : 'w-3 h-3'} ${isFav ? 'fill-yellow-400' : ''}`} />
                  </button>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
