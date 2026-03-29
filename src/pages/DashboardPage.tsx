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
import { useTranslation } from '../i18n/useTranslation';
import type { VodStream, Series, LiveStream } from '../types/xtream';
import DragonBallAura from '../components/DragonBallAura';
import ChannelLogo from '../components/ChannelLogo';

interface WatchHistoryItem {
  id: number;
  name: string;
  type: 'live' | 'vod' | 'series';
  progress?: number;
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

function MediaRow({ title, icon, children, onSeeAll, seeAllLabel }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onSeeAll?: () => void;
  seeAllLabel?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between px-5 mb-4">
        <div className="flex items-center gap-2.5">
          {icon}
          <h2 className="text-lg font-bold tracking-tight channel-name-gradient">{title}</h2>
        </div>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="text-accent/80 text-xs flex items-center gap-1 hover:text-accent transition-colors font-medium"
          >
            {seeAllLabel || 'See all'} <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div
        ref={scrollRef}
        className="flex gap-3.5 px-5 overflow-x-auto scrollbar-hide pb-2"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {children}
      </div>
    </section>
  );
}

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
      className={`group relative shrink-0 rounded-xl overflow-hidden bg-surface-light card-hover focus-visible:ring-2 focus-visible:ring-accent border border-white/[0.04] ${
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
              className={`w-full h-full object-cover transition-all duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'} group-hover:scale-105`}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-surface to-surface-lighter flex items-center justify-center">
            <Film className="w-10 h-10 text-text-secondary/20" />
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-300 flex items-center justify-center">
          <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center shadow-lg shadow-accent/25 transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-5 h-5 text-black fill-black ml-0.5" />
          </div>
        </div>
        {/* Rating badge */}
        {rating && parseFloat(rating) > 0 && (
          <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md text-accent text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 border border-white/[0.06]">
            <Star className="w-2.5 h-2.5 fill-accent" /> {parseFloat(rating).toFixed(1)}
          </div>
        )}
        {/* Progress bar */}
        {progress !== undefined && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10">
            <div
              className="h-full bg-accent rounded-r-full"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className={`font-medium truncate channel-name-gradient ${isTV ? 'text-sm' : 'text-xs'}`}>
          {title}
        </p>
        {subtitle && (
          <p className="text-text-secondary/60 text-[10px] truncate mt-0.5">{subtitle}</p>
        )}
      </div>
    </button>
  );
}

function LiveChannelCard({ stream, epg, onClick, isLast }: {
  stream: LiveStream;
  epg?: EpgProgram | null;
  onClick: () => void;
  isLast?: boolean;
}) {
  const isTV = useIsTV();
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      className={`group shrink-0 rounded-xl overflow-hidden card-hover focus-visible:ring-2 focus-visible:ring-accent border transition-colors ${
        isTV ? 'w-52 p-3.5' : 'w-44 p-3'
      } ${isLast
        ? 'border-accent/25 bg-accent/[0.04]'
        : 'border-white/[0.04] bg-surface-light/50 hover:bg-surface-light/80'
      }`}
      style={{ scrollSnapAlign: 'start' }}
    >
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="relative w-10 h-10 shrink-0">
          <DragonBallAura streamId={stream.stream_id} size="xs" />
          <div className="relative z-[1] w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
            <ChannelLogo name={stream.name} size="sm" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className={`font-medium truncate channel-name-gradient ${isTV ? 'text-sm' : 'text-xs'}`}>
            {stream.name}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-400/80 text-[10px] font-semibold uppercase tracking-wide">Live</span>
          </div>
        </div>
      </div>
      {epg && (
        <div className="bg-surface/50 rounded-lg p-2 border border-white/[0.03]">
          <p className="text-text-primary text-[11px] font-medium truncate">{epg.title}</p>
          <p className="text-text-secondary/60 text-[10px] mt-0.5">
            {epg.start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - {epg.stop.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      )}
      {isLast && (
        <div className="mt-2 flex items-center gap-1 text-accent/80 text-[10px] font-medium">
          <Clock className="w-3 h-3" /> {t('dash.lastChannel')}
        </div>
      )}
    </button>
  );
}

export default function DashboardPage() {
  const credentials = useAuthStore((s) => s.credentials)!;
  const {
    openPlayer, lastChannelId, setLastChannel, favorites,
    liveStreams, setLiveStreams,
    vodStreams: cachedVod, setVodStreams,
    seriesList: cachedSeries, setSeriesList,
  } = useIptvStore();
  const { t } = useTranslation();
  const [recentVod, setRecentVod] = useState<VodStream[]>([]);
  const [trendingSeries, setTrendingSeries] = useState<Series[]>([]);
  const [topChannels, setTopChannels] = useState<LiveStream[]>([]);
  const [history] = useState<WatchHistoryItem[]>(loadHistory());
  const [epgData, setEpgData] = useState<Map<string, EpgProgram>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Use cached data instantly if available
    if (cachedVod.length > 0) {
      const sorted = [...cachedVod].sort((a, b) => parseInt(b.added || '0') - parseInt(a.added || '0'));
      setRecentVod(sorted.slice(0, 20));
    }
    if (cachedSeries.length > 0) {
      const sorted = [...cachedSeries].sort((a, b) => (b.rating_5based || 0) - (a.rating_5based || 0));
      setTrendingSeries(sorted.slice(0, 20));
    }
    if (liveStreams.length > 0) {
      const favCh = liveStreams.filter((s) => favorites.includes(s.stream_id));
      const otherCh = liveStreams.filter((s) => !favorites.includes(s.stream_id));
      setTopChannels([...favCh, ...otherCh].slice(0, 20));
    }
    // If all cached, skip loading state
    if (cachedVod.length > 0 && cachedSeries.length > 0 && liveStreams.length > 0) {
      setLoading(false);
    }

    // Load each section independently — show as soon as ready
    async function loadLive() {
      if (liveStreams.length > 0) return;
      try {
        const live = await getLiveStreams(credentials);
        if (!mounted) return;
        setLiveStreams(live);
        const favCh = live.filter((s) => favorites.includes(s.stream_id));
        const otherCh = live.filter((s) => !favorites.includes(s.stream_id));
        setTopChannels([...favCh, ...otherCh].slice(0, 20));
      } catch { /* ignore */ }
    }

    async function loadVod() {
      if (cachedVod.length > 0) return;
      try {
        const vod = await getVodStreams(credentials);
        if (!mounted) return;
        setVodStreams(vod);
        const sorted = [...vod].sort((a, b) => parseInt(b.added || '0') - parseInt(a.added || '0'));
        setRecentVod(sorted.slice(0, 20));
      } catch { /* ignore */ }
    }

    async function loadSeries() {
      if (cachedSeries.length > 0) return;
      try {
        const series = await getSeriesList(credentials);
        if (!mounted) return;
        setSeriesList(series);
        const sorted = [...series].sort((a, b) => (b.rating_5based || 0) - (a.rating_5based || 0));
        setTrendingSeries(sorted.slice(0, 20));
      } catch { /* ignore */ }
    }

    // Fire all in parallel, each updates UI independently
    Promise.all([loadLive(), loadVod(), loadSeries()]).finally(() => {
      if (mounted) setLoading(false);
    });

    // Load EPG in background
    epgService.loadFromXtream(credentials.server, credentials.username, credentials.password);
    return () => { mounted = false; };
  }, [credentials])

  // Load EPG when live channels are ready
  useEffect(() => {
    if (topChannels.length === 0) return;
    let mounted = true;
    async function loadEpg() {
      const epgMap = new Map<string, EpgProgram>();
      const epgChannels = topChannels.slice(0, 10).filter(ch => ch.epg_channel_id);
      const epgResults = await Promise.allSettled(
        epgChannels.map(ch => epgService.getCurrentProgram(ch.epg_channel_id!).then(prog => ({ id: ch.epg_channel_id!, prog })))
      );
      for (const result of epgResults) {
        if (result.status === 'fulfilled' && result.value.prog) {
          epgMap.set(result.value.id, result.value.prog);
        }
      }
      if (mounted) setEpgData(epgMap);
    }
    loadEpg();
    return () => { mounted = false; };
  }, [topChannels]);

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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('dash.greeting.morning') : hour < 18 ? t('dash.greeting.afternoon') : t('dash.greeting.evening');

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-5 animate-fade-in">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <DragonBallAura streamId={4} size="xs" />
          </div>
          <div className="text-center">
            <p className="font-medium text-sm channel-name-gradient">{t('dash.loading')}</p>
            <p className="text-text-secondary/50 text-xs mt-1">{t('dash.wait')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pt-2 pb-8 page-enter">
      {/* Hero greeting */}
      <div className="px-5 mb-8">
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.05]" style={{background: 'linear-gradient(135deg, rgba(120,70,0,0.15) 0%, rgba(20,20,20,0.95) 50%, rgba(20,20,20,1) 100%)'}}>
          <div className="absolute top-0 right-0 w-72 h-72 bg-accent/[0.04] rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/[0.02] rounded-full blur-[60px]" />
          {/* Subtle pattern */}
          <div className="absolute inset-0 opacity-[0.02]" style={{backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '24px 24px'}} />
          <div className="relative p-6 md:p-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="relative w-5 h-5 flex items-center justify-center">
                <DragonBallAura streamId={7} size="xs" />
              </div>
              <span className="text-accent/70 text-[11px] font-semibold uppercase tracking-[0.15em]">8K Player</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1.5 tracking-tight channel-name-gradient">{greeting} !</h1>
            <p className="text-text-secondary text-sm">{t('dash.subtitle')}</p>

            {/* Quick stats */}
            <div className="flex gap-5 mt-6">
              {[
                { icon: Radio, color: 'red', bg: 'red-500/10', count: topChannels.length, label: t('dash.channels'), dbId: 1 },
                { icon: Film, color: 'blue', bg: 'blue-500/10', count: recentVod.length, label: t('dash.movies'), dbId: 8 },
                { icon: Clapperboard, color: 'emerald', bg: 'emerald-500/10', count: trendingSeries.length, label: t('dash.series'), dbId: 15 },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-2.5 group">
                  <div className="relative w-9 h-9">
                    <DragonBallAura streamId={stat.dbId} size="xs" />
                    <div className={`relative z-[1] w-9 h-9 rounded-xl flex items-center justify-center`}>
                      <stat.icon className={`w-4 h-4 text-${stat.color}-400`} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-bold leading-none channel-name-gradient"><AnimatedNumber value={stat.count} /></p>
                    <p className="text-text-secondary/50 text-[10px] mt-0.5">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick resume */}
            {lastChannelId && topChannels.length > 0 && (() => {
              const lastCh = topChannels.find((s) => s.stream_id === lastChannelId) || liveStreams.find((s) => s.stream_id === lastChannelId);
              if (!lastCh) return null;
              return (
                <button
                  onClick={() => playLive(lastCh)}
                  className="mt-6 flex items-center gap-3 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] hover:border-accent/20 rounded-xl px-4 py-3 transition-all group w-full"
                >
                  <div className="relative w-10 h-10 shrink-0">
                    <DragonBallAura streamId={lastCh.stream_id} size="xs" />
                    <div className="relative z-[1] w-10 h-10 rounded-xl flex items-center justify-center">
                      <Play className="w-5 h-5 text-accent fill-accent" />
                    </div>
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <p className="text-text-secondary/50 text-[10px] uppercase tracking-[0.12em] font-medium">{t('dash.resume')}</p>
                    <p className="text-sm font-medium truncate channel-name-gradient">{lastCh.name}</p>
                  </div>
                  <span className="flex items-center gap-1.5 bg-red-500/10 rounded-full px-2.5 py-1">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-red-400/80 text-[10px] font-semibold">LIVE</span>
                  </span>
                </button>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Resume watching */}
      {history.length > 0 && (
        <MediaRow
          title={t('dash.resumeWatching')}
          icon={<div className="relative w-6 h-6 flex items-center justify-center"><DragonBallAura streamId={2} size="xs" /><Clock className="w-4 h-4 text-accent/70 relative z-[1]" /></div>}
        >
          {history.slice(0, 10).map((item) => (
            <PosterCard
              key={`${item.type}-${item.id}`}
              title={item.name}
              image={item.image}
              progress={item.progress}
              subtitle={item.type === 'live' ? t('dash.live') : item.type === 'vod' ? t('dash.movie') : t('dash.serie')}
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
          title={t('dash.liveChannels')}
          icon={<div className="relative w-6 h-6 flex items-center justify-center"><DragonBallAura streamId={3} size="xs" /><Tv className="w-4 h-4 text-red-400/80 relative z-[1]" /></div>}
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
          title={t('dash.recentMovies')}
          icon={<div className="relative w-6 h-6 flex items-center justify-center"><DragonBallAura streamId={5} size="xs" /><Film className="w-4 h-4 text-blue-400/80 relative z-[1]" /></div>}
        >
          {recentVod.map((vod) => (
            <PosterCard
              key={vod.stream_id}
              title={vod.name}
              image={vod.stream_icon}
              subtitle={[vod.genre, vod.year].filter(Boolean).join(' · ')}
              rating={vod.rating}
              onClick={() => playVod(vod)}
            />
          ))}
        </MediaRow>
      )}

      {/* Trending series */}
      {trendingSeries.length > 0 && (
        <MediaRow
          title={t('dash.trendingSeries')}
          icon={<div className="relative w-6 h-6 flex items-center justify-center"><DragonBallAura streamId={6} size="xs" /><TrendingUp className="w-4 h-4 text-emerald-400/80 relative z-[1]" /></div>}
        >
          {trendingSeries.map((s) => (
            <PosterCard
              key={s.series_id}
              title={s.name}
              image={s.cover}
              subtitle={[s.genre, s.release_date?.slice(0, 4)].filter(Boolean).join(' · ')}
              rating={s.rating}
              onClick={() => {
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
