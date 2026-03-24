import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useIptvStore } from '../store/iptvStore';
import {
  getVodStreams, getSeriesList, getLiveStreams,
  buildLiveStreamUrl, buildVodStreamUrl,
} from '../services/xtreamApi';
import { epgService, type EpgProgram } from '../services/epgService';
import { useIsTV } from '../hooks/useIsTV';
import {
  Play, Clock, Tv, Film, TrendingUp,
  ChevronRight, Star, Zap, Radio, Clapperboard, Sparkles,
} from 'lucide-react';
import { playClick as _playClick } from '../services/sounds';
void _playClick;
import type { VodStream, Series, LiveStream } from '../types/xtream';

interface WatchHistoryItem {
  id: number;
  name: string;
  type: 'live' | 'vod' | 'series';
  progress?: number; // 0-100
  image?: string;
  timestamp: number;
}

function loadHistory(): WatchHistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem('iptv_history') || '[]');
  } catch { return []; }
}

export function saveToHistory(item: Omit<WatchHistoryItem, 'timestamp'>): void {
  const history = loadHistory().filter((h) => !(h.id === item.id && h.type === item.type));
  history.unshift({ ...item, timestamp: Date.now() });
  localStorage.setItem('iptv_history', JSON.stringify(history.slice(0, 50)));
}

// Animated counter
function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) return;
    let start = 0;
    const duration = 1200;
    const step = Math.ceil(value / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(start);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display.toLocaleString()}{suffix}</>;
}

// Horizontal scrollable row
function MediaRow({ title, icon, children, onSeeAll }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onSeeAll?: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        </div>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="text-accent text-sm flex items-center gap-1 hover:underline"
          >
            Voir tout <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
      <div
        ref={scrollRef}
        className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {children}
      </div>
    </section>
  );
}

// Poster card for movies/series
function PosterCard({ title, image, subtitle, rating, progress, onClick }: {
  title: string;
  image?: string;
  subtitle?: string;
  rating?: string;
  progress?: number;
  onClick: () => void;
}) {
  const isTV = useIsTV();
  const [imgLoaded, setImgLoaded] = useState(false);
  return (
    <button
      onClick={onClick}
      className={`group relative shrink-0 rounded-xl overflow-hidden bg-surface-light card-hover focus-visible:ring-2 focus-visible:ring-accent ${
        isTV ? 'w-44' : 'w-36'
      }`}
      style={{ scrollSnapAlign: 'start' }}
    >
      <div className="aspect-[2/3] relative">
        {image ? (
          <>
            {!imgLoaded && <div className="absolute inset-0 skeleton" />}
            <img
              src={image}
              alt={title}
              className={`w-full h-full object-cover transition-all duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'} group-hover:scale-110`}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-surface to-surface-lighter flex items-center justify-center">
            <Film className="w-10 h-10 text-text-secondary/30" />
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-accent/90 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-accent/30 transform scale-75 group-hover:scale-100 transition-transform">
            <Play className="w-6 h-6 text-black fill-black ml-0.5" />
          </div>
        </div>
        {/* Rating badge */}
        {rating && parseFloat(rating) > 0 && (
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-accent text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 badge-glow">
            <Star className="w-2.5 h-2.5 fill-accent" /> {parseFloat(rating).toFixed(1)}
          </div>
        )}
        {/* Progress bar */}
        {progress !== undefined && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
            <div
              className="h-full bg-accent rounded-r"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}
      </div>
      <div className="p-2">
        <p className={`text-text-primary font-medium truncate ${isTV ? 'text-sm' : 'text-xs'}`}>
          {title}
        </p>
        {subtitle && (
          <p className="text-text-secondary text-[10px] truncate mt-0.5">{subtitle}</p>
        )}
      </div>
    </button>
  );
}

// Live channel card for dashboard
function LiveChannelCard({ stream, epg, onClick, isLast }: {
  stream: LiveStream;
  epg?: EpgProgram | null;
  onClick: () => void;
  isLast?: boolean;
}) {
  const isTV = useIsTV();
  return (
    <button
      onClick={onClick}
      className={`group shrink-0 rounded-xl overflow-hidden glass card-hover focus-visible:ring-2 focus-visible:ring-accent ${
        isTV ? 'w-52 p-3' : 'w-44 p-2.5'
      } ${isLast ? 'ring-1 ring-accent/30 bg-accent/5' : ''}`}
      style={{ scrollSnapAlign: 'start' }}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center overflow-hidden shrink-0">
          {stream.stream_icon ? (
            <img
              src={stream.stream_icon}
              alt=""
              className="w-full h-full object-contain"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <Tv className="w-5 h-5 text-text-secondary/50" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-text-primary font-medium truncate ${isTV ? 'text-sm' : 'text-xs'}`}>
            {stream.name}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-400 text-[10px] font-semibold uppercase">Live</span>
          </div>
        </div>
      </div>
      {epg && (
        <div className="bg-surface/60 rounded-lg p-2">
          <p className="text-text-primary text-[11px] font-medium truncate">{epg.title}</p>
          <p className="text-text-secondary text-[10px] mt-0.5">
            {epg.start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - {epg.stop.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      )}
      {isLast && (
        <div className="mt-2 flex items-center gap-1 text-accent text-[10px]">
          <Clock className="w-3 h-3" /> Derniere chaine
        </div>
      )}
    </button>
  );
}

export default function DashboardPage() {
  const credentials = useAuthStore((s) => s.credentials)!;
  const {
    openPlayer, lastChannelId, setLastChannel, favorites, liveStreams, setLiveStreams,
  } = useIptvStore();
  const [recentVod, setRecentVod] = useState<VodStream[]>([]);
  const [trendingSeries, setTrendingSeries] = useState<Series[]>([]);
  const [topChannels, setTopChannels] = useState<LiveStream[]>([]);
  const [history] = useState<WatchHistoryItem[]>(loadHistory());
  const [epgData, setEpgData] = useState<Map<string, EpgProgram>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [vod, series, live] = await Promise.all([
          getVodStreams(credentials).catch(() => []),
          getSeriesList(credentials).catch(() => []),
          liveStreams.length > 0
            ? Promise.resolve(liveStreams)
            : getLiveStreams(credentials).catch(() => []),
        ]);
        if (!mounted) return;

        // Sort VOD by recently added
        const sortedVod = [...vod].sort((a, b) => parseInt(b.added || '0') - parseInt(a.added || '0'));
        setRecentVod(sortedVod.slice(0, 20));

        // Trending series (by rating)
        const sortedSeries = [...series].sort((a, b) => (b.rating_5based || 0) - (a.rating_5based || 0));
        setTrendingSeries(sortedSeries.slice(0, 20));

        // Top channels (favorites first, then first 20)
        if (live.length > 0 && liveStreams.length === 0) setLiveStreams(live);
        const favChannels = live.filter((s) => favorites.includes(s.stream_id));
        const otherChannels = live.filter((s) => !favorites.includes(s.stream_id));
        setTopChannels([...favChannels, ...otherChannels].slice(0, 20));

        // Load EPG for top channels
        const epgMap = new Map<string, EpgProgram>();
        for (const ch of [...favChannels, ...otherChannels].slice(0, 10)) {
          if (ch.epg_channel_id) {
            const prog = await epgService.getCurrentProgram(ch.epg_channel_id);
            if (prog) epgMap.set(ch.epg_channel_id, prog);
          }
        }
        if (mounted) setEpgData(epgMap);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();

    // Start EPG background load
    epgService.loadFromXtream(credentials.server, credentials.username, credentials.password);

    return () => { mounted = false; };
  }, [credentials]);

  const playLive = (stream: LiveStream) => {
    setLastChannel(stream.stream_id);
    const url = buildLiveStreamUrl(credentials, stream.stream_id);
    openPlayer(url, stream.name, stream.stream_id, 'live');
    saveToHistory({ id: stream.stream_id, name: stream.name, type: 'live', image: stream.stream_icon });
  };

  const playVod = (vod: VodStream) => {
    const url = buildVodStreamUrl(credentials, vod.stream_id, vod.container_extension || 'mp4');
    openPlayer(url, vod.name);
    saveToHistory({ id: vod.stream_id, name: vod.name, type: 'vod', image: vod.stream_icon });
  };

  // Greeting based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="relative">
            <div className="absolute inset-0 bg-accent/20 rounded-full blur-xl animate-pulse" />
            <Zap className="w-12 h-12 text-accent animate-pulse relative" />
          </div>
          <p className="text-text-secondary font-medium">Chargement du contenu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pt-4 pb-8 page-enter">
      {/* Hero greeting */}
      <div className="px-4 mb-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-900/30 via-surface to-surface p-6 border border-accent/10">
          <div className="absolute top-0 right-0 w-60 h-60 bg-accent/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-accent/3 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-accent text-xs font-medium uppercase tracking-wider">8K Player</span>
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">{greeting} !</h1>
            <p className="text-text-secondary text-sm mb-4">Que voulez-vous regarder aujourd'hui ?</p>

            {/* Quick stats */}
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
                  <Radio className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <p className="text-text-primary text-sm font-bold"><AnimatedNumber value={topChannels.length} /></p>
                  <p className="text-text-secondary text-[10px]">Chaînes</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                  <Film className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-text-primary text-sm font-bold"><AnimatedNumber value={recentVod.length} /></p>
                  <p className="text-text-secondary text-[10px]">Films</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
                  <Clapperboard className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-text-primary text-sm font-bold"><AnimatedNumber value={trendingSeries.length} /></p>
                  <p className="text-text-secondary text-[10px]">Séries</p>
                </div>
              </div>
            </div>

            {/* Quick resume last channel */}
            {lastChannelId && topChannels.length > 0 && (() => {
              const lastCh = topChannels.find((s) => s.stream_id === lastChannelId) || liveStreams.find((s) => s.stream_id === lastChannelId);
              if (!lastCh) return null;
              return (
                <button
                  onClick={() => playLive(lastCh)}
                  className="mt-4 flex items-center gap-3 bg-accent/10 hover:bg-accent/20 border border-accent/20 rounded-xl px-4 py-3 transition-all group w-full"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center shrink-0 group-hover:bg-accent/30 transition">
                    <Play className="w-5 h-5 text-accent fill-accent" />
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <p className="text-text-secondary text-[10px] uppercase tracking-wider">Reprendre</p>
                    <p className="text-text-primary text-sm font-medium truncate">{lastCh.name}</p>
                  </div>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-red-400 text-[10px] font-semibold">LIVE</span>
                  </span>
                </button>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Hero: Resume watching */}
      {history.length > 0 && (
        <MediaRow
          title="Reprendre la lecture"
          icon={<Clock className="w-5 h-5 text-accent" />}
        >
          {history.slice(0, 10).map((item) => (
            <PosterCard
              key={`${item.type}-${item.id}`}
              title={item.name}
              image={item.image}
              progress={item.progress}
              subtitle={item.type === 'live' ? 'En direct' : item.type === 'vod' ? 'Film' : 'Serie'}
              onClick={() => {
                if (item.type === 'live') {
                  const stream = liveStreams.find((s) => s.stream_id === item.id);
                  if (stream) playLive(stream);
                } else if (item.type === 'vod') {
                  const vod = recentVod.find((v) => v.stream_id === item.id);
                  if (vod) playVod(vod);
                }
              }}
            />
          ))}
        </MediaRow>
      )}

      {/* Live channels */}
      {topChannels.length > 0 && (
        <MediaRow
          title="Chaines en direct"
          icon={<Tv className="w-5 h-5 text-red-400" />}
        >
          {topChannels.map((stream) => (
            <LiveChannelCard
              key={stream.stream_id}
              stream={stream}
              epg={stream.epg_channel_id ? epgData.get(stream.epg_channel_id) : undefined}
              onClick={() => playLive(stream)}
              isLast={stream.stream_id === lastChannelId}
            />
          ))}
        </MediaRow>
      )}

      {/* Recent movies */}
      {recentVod.length > 0 && (
        <MediaRow
          title="Films recents"
          icon={<Film className="w-5 h-5 text-blue-400" />}
        >
          {recentVod.map((vod) => (
            <PosterCard
              key={vod.stream_id}
              title={vod.name}
              image={vod.stream_icon}
              subtitle={[vod.genre, vod.year].filter(Boolean).join(' - ')}
              rating={vod.rating}
              onClick={() => playVod(vod)}
            />
          ))}
        </MediaRow>
      )}

      {/* Trending series */}
      {trendingSeries.length > 0 && (
        <MediaRow
          title="Series tendance"
          icon={<TrendingUp className="w-5 h-5 text-green-400" />}
        >
          {trendingSeries.map((s) => (
            <PosterCard
              key={s.series_id}
              title={s.name}
              image={s.cover}
              subtitle={[s.genre, s.release_date?.slice(0, 4)].filter(Boolean).join(' - ')}
              rating={s.rating}
              onClick={() => {
                // Navigate to series page
                window.location.hash = '';
                window.location.pathname = '/series';
              }}
            />
          ))}
        </MediaRow>
      )}
    </div>
  );
}
