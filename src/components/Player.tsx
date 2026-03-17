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

export default function Player() {
  const {
    playerUrl, playerTitle, playerStreamId, playerMode,
    closePlayer, openPlayer,
    liveStreams, liveCategories, selectedLiveCategory,
    setLastChannel, favorites, toggleFavorite,
  } = useIptvStore();
  const credentials = useAuthStore((s) => s.credentials);
  const { t } = useTranslation();

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

  // Auto-hide controls after 3s
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      if (!showChannelList) setShowControls(false);
    }, 3000);
  }, [showChannelList]);

  useEffect(() => {
    const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFs);
    return () => document.removeEventListener('fullscreenchange', handleFs);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!playerUrl) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case 'Escape':
          if (showChannelList) setShowChannelList(false);
          else closePlayer();
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
          if (playerMode === 'live') navigateChannel(-1);
          break;
        case 'ArrowDown':
          if (playerMode === 'live') navigateChannel(1);
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
  }, [playerUrl, playerMode, playerStreamId, liveStreams, showChannelList]);

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
      video.src = playerUrl;
      video.addEventListener('loadeddata', () => setLoading(false));
      video.addEventListener('error', () => {
        setLoading(false);
        setError(t('player.error.video'));
      });
      video.play().catch(() => {});
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
        className={`absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/90 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {isLive && (
            <span className="shrink-0 flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              {t('player.live')}
            </span>
          )}
          <h3 className="text-white font-medium truncate text-sm">{playerTitle}</h3>
          {isLive && currentCategory && (
            <span className="hidden sm:inline text-white/40 text-xs truncate">
              {currentCategory.category_name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isLive && (
            <>
              <button
                onClick={() => navigateChannel(-1)}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
                title={t('player.prev')}
              >
                <ChevronUp className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigateChannel(1)}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
                title={t('player.next')}
              >
                <ChevronDown className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowChannelList((s) => !s)}
                className={`p-2 rounded-lg transition ${
                  showChannelList ? 'text-accent bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
                title={t('player.channelList')}
              >
                <List className="w-5 h-5" />
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
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
            title={t('player.mute')}
          >
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <button
            onClick={togglePiP}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
            title="Picture-in-Picture"
          >
            <PictureInPicture2 className="w-5 h-5" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
            title={t('player.fullscreen')}
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
          <button
            onClick={closePlayer}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
            title={t('player.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Video */}
      <div className="flex-1 flex items-center justify-center relative">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
            <Loader2 className="w-10 h-10 text-accent animate-spin" />
            <p className="text-white/60 text-sm">{t('player.loading')}</p>
          </div>
        )}
        {error && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl px-5 py-3 flex items-center gap-3 z-10 max-w-lg">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{error}</p>
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
        <div className="absolute top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-surface/95 backdrop-blur-xl z-40 flex flex-col border-l border-surface-lighter shadow-2xl animate-slide-in-right">
          <div className="p-3 border-b border-surface-lighter">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-text-primary font-semibold text-sm">{t('player.channels')}</h4>
              <button
                onClick={() => setShowChannelList(false)}
                className="p-1 text-text-secondary hover:text-text-primary transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
              <input
                type="text"
                placeholder={t('player.searchChannels')}
                value={channelSearch}
                onChange={(e) => setChannelSearch(e.target.value)}
                className="w-full bg-surface-light border border-surface-lighter rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent transition"
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
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition group ${
                    isActive
                      ? 'bg-accent/15 border-l-2 border-accent'
                      : 'hover:bg-surface-light border-l-2 border-transparent'
                  }`}
                >
                  <div className="w-8 h-8 rounded-md bg-surface-lighter flex items-center justify-center shrink-0 overflow-hidden">
                    {stream.stream_icon ? (
                      <img
                        src={stream.stream_icon}
                        alt=""
                        className="w-full h-full object-contain"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <span className="text-text-secondary text-[10px] font-bold">
                        {stream.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <span className={`flex-1 text-xs truncate ${
                    isActive ? 'text-accent font-semibold' : 'text-text-primary group-hover:text-accent'
                  }`}>
                    {stream.name}
                  </span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse shrink-0" />
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(stream.stream_id); }}
                    className={`p-1 rounded transition shrink-0 ${
                      isFav ? 'text-yellow-400' : 'text-white/20 hover:text-yellow-400 opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <Star className={`w-3 h-3 ${isFav ? 'fill-yellow-400' : ''}`} />
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
