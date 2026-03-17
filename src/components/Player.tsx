import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  X, Maximize, Minimize, Loader2, AlertCircle,
  List, ChevronUp, ChevronDown, Volume2, VolumeX,
  PictureInPicture2, Search, Star,
} from 'lucide-react';
import { useIptvStore } from '../store/iptvStore';
import { useAuthStore } from '../store/authStore';
import { buildLiveStreamUrl } from '../services/xtreamApi';
import { useTranslation } from '../i18n/useTranslation';
import { useIsTV } from '../hooks/useIsTV';

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
  const containerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showChannelList, setShowChannelList] = useState(false);
  const [channelSearch, setChannelSearch] = useState('');
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // Icon sizes based on TV mode
  const iconSize = isTV ? 'w-7 h-7' : 'w-5 h-5';
  const btnPad = isTV ? 'p-3' : 'p-2';

  // Auto-hide controls after 3s (5s on TV)
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

  // Keyboard / D-pad shortcuts
  useEffect(() => {
    if (!playerUrl) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case 'Escape':
        case 'Backspace': // Android TV back button
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
          if (!showChannelList && playerMode === 'live') navigateChannel(-1);
          break;
        case 'ArrowDown':
          if (!showChannelList && playerMode === 'live') navigateChannel(1);
          break;
        case 'ArrowLeft':
          // On TV, show controls
          if (isTV) resetControlsTimer();
          break;
        case 'ArrowRight':
          // On TV, toggle channel list
          if (isTV && playerMode === 'live') setShowChannelList((s) => !s);
          break;
        case 'Enter':
          // On TV, toggle play/pause with center/select button
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
  }, [playerUrl, playerMode, playerStreamId, liveStreams, showChannelList, isTV]);

  // Load video source
  useEffect(() => {
    if (!playerUrl || !videoRef.current) return;

    const video = videoRef.current;
    setLoading(true);
    setError('');

    const isHls = playerUrl.includes('.m3u8');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;
      hls.loadSource(playerUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setLoading(false);
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            setError(t('player.error.network'));
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            setError(t('player.error.media'));
            hls.recoverMediaError();
          } else {
            setError(t('player.error.fatal'));
            hls.destroy();
          }
        }
      });
    } else {
      // For .ts streams and other formats: use native video element
      video.src = playerUrl;
      const onCanPlay = () => {
        setLoading(false);
        video.play().catch(() => {});
      };
      const onError = () => {
        setLoading(false);
        setError(t('player.error.network'));
      };
      video.addEventListener('canplay', onCanPlay);
      video.addEventListener('error', onError);
      // Also try to play immediately
      video.play().catch(() => {});

      return () => {
        video.removeEventListener('canplay', onCanPlay);
        video.removeEventListener('error', onError);
      };
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
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
    setLastChannel(next.stream_id);
    const url = buildLiveStreamUrl(credentials, next.stream_id);
    openPlayer(url, next.name, next.stream_id, 'live');
  };

  const switchToChannel = (stream: typeof liveStreams[0]) => {
    if (!credentials) return;
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

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black flex flex-col"
      onMouseMove={resetControlsTimer}
      onClick={resetControlsTimer}
    >
      {/* Top bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-30 flex items-center justify-between bg-gradient-to-b from-black/90 to-transparent transition-opacity duration-300 ${
          isTV ? 'px-6 py-4' : 'px-4 py-3'
        } ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {isLive && (
            <span className={`shrink-0 flex items-center gap-1.5 bg-red-600 text-white font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${
              isTV ? 'text-sm' : 'text-[10px]'
            }`}>
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              {t('player.live')}
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
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-6 bg-black/60 rounded-xl px-6 py-3 text-white/50 text-sm">
          <span>▲▼ Chaînes</span>
          <span>◀ Retour</span>
          <span>▶ Liste</span>
          <span>OK Pause</span>
        </div>
      )}

      {/* Video */}
      <div className="flex-1 flex items-center justify-center relative">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
            <Loader2 className={`text-accent animate-spin ${isTV ? 'w-14 h-14' : 'w-10 h-10'}`} />
            <p className={`text-white/60 ${isTV ? 'text-base' : 'text-sm'}`}>{t('player.loading')}</p>
          </div>
        )}
        {error && (
          <div className={`absolute bottom-20 left-1/2 -translate-x-1/2 bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl px-5 py-3 flex items-center gap-3 z-10 max-w-lg ${
            isTV ? 'text-base' : 'text-sm'
          }`}>
            <AlertCircle className={`shrink-0 ${isTV ? 'w-6 h-6' : 'w-5 h-5'}`} />
            <p>{error}</p>
          </div>
        )}
        <video
          ref={videoRef}
          controls
          autoPlay
          className="w-full h-full bg-black"
          muted={muted}
        />
      </div>

      {/* Channel list sidebar */}
      {isLive && showChannelList && (
        <div className={`absolute top-0 right-0 bottom-0 bg-surface/95 backdrop-blur-xl z-40 flex flex-col border-l border-surface-lighter shadow-2xl animate-slide-in-right ${
          isTV ? 'w-96 max-w-[85vw]' : 'w-80 max-w-[85vw]'
        }`}>
          <div className={`border-b border-surface-lighter ${isTV ? 'p-4' : 'p-3'}`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className={`text-text-primary font-semibold ${isTV ? 'text-base' : 'text-sm'}`}>{t('player.channels')}</h4>
              <button
                onClick={() => setShowChannelList(false)}
                className={`text-text-secondary hover:text-text-primary focus-visible:text-text-primary transition ${isTV ? 'p-2' : 'p-1'}`}
              >
                <X className={isTV ? 'w-5 h-5' : 'w-4 h-4'} />
              </button>
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
            {filteredChannels.map((stream) => {
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
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(stream.stream_id); }}
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
