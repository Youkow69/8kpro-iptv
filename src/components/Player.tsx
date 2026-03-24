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
import { buildLiveStreamUrl } from '../services/xtreamApi';
import { useTranslation } from '../i18n/useTranslation';
import { useIsTV } from '../hooks/useIsTV';
import { streamPreloader } from '../services/preloader';
import { playChannelUp, playChannelDown, playClick, playFavoriteAdd, playFavoriteRemove } from '../services/sounds';

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
  const maxRetries = 3;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showChannelList, setShowChannelList] = useState(false);
  const [channelSearch, setChannelSearch] = useState('');
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(1);
  const [channelTransition, setChannelTransition] = useState(false);
  const controlsTimer = useRef<ReturnType<typeof setTimeout>>(null);

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

  // Cleanup players helper
  const cleanupPlayers = useCallback(() => {
    if (hlsRef.current) {
      try { hlsRef.current.destroy(); } catch {}
      hlsRef.current = null;
    }
    if (mpegtsRef.current) {
      try { mpegtsRef.current.destroy(); } catch {}
      mpegtsRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }
  }, []);

  // Retry logic
  const retryStream = useCallback(() => {
    if (!playerUrl || retryCountRef.current >= maxRetries) {
      setError(t('player.error.fatal'));
      return;
    }
    retryCountRef.current++;
    setError('');
    setLoading(true);
    cleanupPlayers();
    // Small delay before retry
    setTimeout(() => {
      if (videoRef.current) {
        loadStream(playerUrl, videoRef.current);
      }
    }, 1000);
  }, [playerUrl]);

  // Main stream loader
  const loadStream = useCallback((url: string, video: HTMLVideoElement) => {
    const isHls = url.includes('.m3u8');
    const isMpegTs = url.includes('.ts');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 10,
        maxMaxBufferLength: 30,
        maxBufferHole: 0.5,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 1000,
        manifestLoadingMaxRetry: 4,
        levelLoadingMaxRetry: 4,
        startFragPrefetch: true,
      });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        retryCountRef.current = 0;
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            // Auto-retry network errors
            if (retryCountRef.current < maxRetries) {
              hls.startLoad();
              retryCountRef.current++;
            } else {
              setLoading(false);
              setError(t('player.error.network'));
            }
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            setLoading(false);
            setError(t('player.error.fatal'));
          }
        }
      });
    } else if (isMpegTs && mpegts.isSupported()) {
      const player = mpegts.createPlayer({
        type: 'mpegts',
        url: url,
        isLive: true,
      }, {
        enableWorker: true,
        enableStashBuffer: true,
        stashInitialSize: 384 * 1024,
        liveBufferLatencyChasing: true,
        liveBufferLatencyMaxLatency: 10,
        liveBufferLatencyMinRemain: 3,
        autoCleanupSourceBuffer: true,
        autoCleanupMaxBackwardDuration: 60,
        autoCleanupMinBackwardDuration: 30,
      });
      mpegtsRef.current = player;
      player.attachMediaElement(video);
      player.load();

      let hasStarted = false;
      let loadTimeout = setTimeout(() => {
        if (!hasStarted) {
          setLoading(false);
          setError(t('player.error.network'));
        }
      }, 20000);

      // Auto-reconnect: detect ALL types of stream interruption
      let lastTime = 0;
      let freezeCheckInterval: ReturnType<typeof setInterval> | null = null;
      let isReconnecting = false;

      const autoReconnect = (reason: string) => {
        if (isReconnecting) return;
        isReconnecting = true;
        console.log('[Player] ' + reason + ', reconnecting...');
        if (freezeCheckInterval) { clearInterval(freezeCheckInterval); freezeCheckInterval = null; }
        cleanupPlayers();
        setTimeout(() => {
          isReconnecting = false;
          loadStream(url, video);
        }, 500);
      };

      // 1. Monitor currentTime - if stuck for 5s, reconnect
      freezeCheckInterval = setInterval(() => {
        if (!hasStarted || isReconnecting) return;
        // If paused but we didn't pause it manually, it's a freeze
        if (video.paused && hasStarted) {
          autoReconnect('Stream paused unexpectedly (proxy timeout)');
          return;
        }
        const currentTime = video.currentTime;
        if (currentTime === lastTime && currentTime > 0) {
          autoReconnect('Stream frozen (currentTime stuck at ' + currentTime + ')');
        }
        lastTime = currentTime;
      }, 4000);

      // 2. MediaSource ended = proxy cut the connection
      video.addEventListener('ended', () => {
        if (hasStarted) autoReconnect('Stream ended (proxy timeout)');
      });

      // 3. Pause event (not user-initiated) = stream ran out of data
      video.addEventListener('pause', () => {
        if (hasStarted && !isReconnecting) {
          // Wait 2s to see if it was user-initiated
          setTimeout(() => {
            if (video.paused && hasStarted && !isReconnecting) {
              autoReconnect('Stream paused (buffer exhausted)');
            }
          }, 2000);
        }
      });

      // 4. Stall/waiting events
      video.addEventListener('stalled', () => {
        if (hasStarted) setTimeout(() => { if (video.paused) autoReconnect('Stall detected'); }, 3000);
      });
      video.addEventListener('waiting', () => {
        if (hasStarted) setTimeout(() => { if (video.paused) autoReconnect('Waiting timeout'); }, 5000);
      });

      player.on(mpegts.Events.ERROR, (_type: string, _detail: string, info: { msg?: string }) => {
        if (!hasStarted) {
          clearTimeout(loadTimeout);
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            cleanupPlayers();
            setTimeout(() => loadStream(url, video), 1500);
          } else {
            setLoading(false);
            setError(t('player.error.network') + (info?.msg ? `: ${info.msg}` : ''));
          }
        } else {
          // Stream was playing but errored - auto reconnect
          console.log('[Player] Stream error during playback, reconnecting...');
          cleanupPlayers();
          setTimeout(() => loadStream(url, video), 1000);
        }
      });

      video.addEventListener('canplay', () => {
        hasStarted = true;
        clearTimeout(loadTimeout);
        retryCountRef.current = 0;
        setLoading(false);
        video.play().catch(() => {});
      }, { once: true });

      video.addEventListener('playing', () => {
        hasStarted = true;
        clearTimeout(loadTimeout);
        retryCountRef.current = 0;
        setLoading(false);
        setError('');
      }, { once: true });

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

    const video = videoRef.current;
    retryCountRef.current = 0;
    setLoading(true);
    setError('');
    setChannelTransition(true);
    setTimeout(() => setChannelTransition(false), 300);

    cleanupPlayers();
    loadStream(playerUrl, video);

    // Pre-cache adjacent channels
    if (playerMode === 'live' && credentials && playerStreamId && liveStreams.length > 0) {
      const idx = liveStreams.findIndex((s) => s.stream_id === playerStreamId);
      if (idx !== -1) {
        const prevIdx = (idx - 1 + liveStreams.length) % liveStreams.length;
        const nextIdx = (idx + 1) % liveStreams.length;
        const prevUrl = buildLiveStreamUrl(credentials, liveStreams[prevIdx].stream_id);
        const nextUrl = buildLiveStreamUrl(credentials, liveStreams[nextIdx].stream_id);
        const preloadTimer = setTimeout(() => {
          streamPreloader.preload(prevUrl);
          streamPreloader.preload(nextUrl);
        }, 3000);
        return () => {
          clearTimeout(preloadTimer);
          cleanupPlayers();
        };
      }
    }

    return () => cleanupPlayers();
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

  if (!playerUrl) return null;

  const isLive = playerMode === 'live';
  const filteredChannels = liveStreams.filter((s) =>
    s.name.toLowerCase().includes(channelSearch.toLowerCase())
  );

  const currentCategory = liveCategories.find((c) => c.category_id === selectedLiveCategory);

  // Channel number display
  const currentIdx = liveStreams.findIndex((s) => s.stream_id === playerStreamId);

  // Swipe gestures for mobile channel switching
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
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
      {/* Channel transition overlay */}
      {channelTransition && (
        <div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center animate-scale-in">
          <div className="text-center">
            {currentIdx >= 0 && (
              <div className="relative inline-block mb-3">
                <div className="absolute inset-0 bg-accent/20 rounded-full blur-2xl" />
                <p className="text-accent text-7xl font-black relative">{currentIdx + 1}</p>
              </div>
            )}
            <p className="text-white text-2xl font-semibold mb-1">{playerTitle}</p>
            {isLive && currentCategory && (
              <p className="text-white/40 text-sm">{currentCategory.category_name}</p>
            )}
          </div>
        </div>
      )}

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
              >
                <ChevronUp className={iconSize} />
              </button>
              <button
                onClick={() => navigateChannel(1)}
                className={`${btnPad} text-white/70 hover:text-white hover:bg-white/10 focus-visible:text-white focus-visible:bg-white/10 rounded-lg transition`}
                title={t('player.next')}
              >
                <ChevronDown className={iconSize} />
              </button>
              <button
                onClick={() => setShowChannelList((s) => !s)}
                className={`${btnPad} rounded-lg transition ${
                  showChannelList ? 'text-accent bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/10 focus-visible:text-white focus-visible:bg-white/10'
                }`}
                title={t('player.channelList')}
              >
                <List className={iconSize} />
              </button>
            </>
          )}
          <button
            onClick={() => {
              setMuted((m) => {
                if (videoRef.current) videoRef.current.muted = !m;
                return !m;
              });
            }}
            className={`${btnPad} text-white/70 hover:text-white hover:bg-white/10 focus-visible:text-white focus-visible:bg-white/10 rounded-lg transition`}
            title={t('player.mute')}
          >
            {muted ? <VolumeX className={iconSize} /> : <Volume2 className={iconSize} />}
          </button>
          {!isTV && (
            <button
              onClick={togglePiP}
              className={`${btnPad} text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition`}
              title="Picture-in-Picture"
            >
              <PictureInPicture2 className={iconSize} />
            </button>
          )}
          <button
            onClick={toggleFullscreen}
            className={`${btnPad} text-white/70 hover:text-white hover:bg-white/10 focus-visible:text-white focus-visible:bg-white/10 rounded-lg transition`}
            title={t('player.fullscreen')}
          >
            {isFullscreen ? <Minimize className={iconSize} /> : <Maximize className={iconSize} />}
          </button>
          <button
            onClick={closePlayer}
            className={`${btnPad} text-white/70 hover:text-white hover:bg-white/10 focus-visible:text-white focus-visible:bg-white/10 rounded-lg transition`}
            title={t('player.close')}
          >
            <X className={iconSize} />
          </button>
        </div>
      </div>

      {/* TV overlay hint */}
      {isTV && showControls && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-6 glass rounded-2xl px-8 py-4 text-white/60 text-sm animate-fade-in">
          <span className="flex items-center gap-1.5"><span className="text-accent">▲▼</span> Chaînes</span>
          <span className="flex items-center gap-1.5"><span className="text-accent">◀</span> Retour</span>
          <span className="flex items-center gap-1.5"><span className="text-accent">▶</span> Liste</span>
          <span className="flex items-center gap-1.5"><span className="text-accent">OK</span> Pause</span>
        </div>
      )}

      {/* Video */}
      <div className="flex-1 flex items-center justify-center relative">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-black/40">
            <Loader2 className={`text-accent animate-spin ${isTV ? 'w-14 h-14' : 'w-10 h-10'}`} />
            <p className={`text-white/60 ${isTV ? 'text-base' : 'text-sm'}`}>{t('player.loading')}</p>
            {retryCountRef.current > 0 && (
              <p className="text-white/40 text-xs">Tentative {retryCountRef.current}/{maxRetries}...</p>
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
              Réessayer
            </button>
          </div>
        )}
        <video
          ref={videoRef}
          controls={false}
          autoPlay
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

      {/* Volume bar */}
      {showControls && !isTV && (
        <div className="absolute bottom-16 left-4 z-30 flex flex-col items-center gap-1 glass rounded-full px-1.5 py-2">
          <div className="w-1 h-20 bg-white/20 rounded-full overflow-hidden rotate-180">
            <div
              className="w-full bg-accent rounded-full transition-all"
              style={{ height: `${volume * 100}%` }}
            />
          </div>
          <span className="text-white/50 text-[10px]">{Math.round(volume * 100)}%</span>
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
                  <div className={`rounded-md bg-surface-lighter flex items-center justify-center shrink-0 overflow-hidden ${
                    isTV ? 'w-10 h-10' : 'w-8 h-8'
                  }`}>
                    {stream.stream_icon ? (
                      <img
                        src={stream.stream_icon}
                        alt=""
                        className="w-full h-full object-contain"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <span className={`text-text-secondary font-bold ${isTV ? 'text-xs' : 'text-[10px]'}`}>
                        {stream.name.charAt(0)}
                      </span>
                    )}
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
