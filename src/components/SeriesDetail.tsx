import { useEffect, useState } from 'react';
import { ArrowLeft, Play, Loader2, Star, Calendar, Film } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useIptvStore } from '../store/iptvStore';
import { getSeriesInfo, buildSeriesStreamUrl } from '../services/xtreamApi';
import type { Series, SeriesInfo, Episode } from '../types/xtream';
import { useTranslation } from '../i18n/useTranslation';

interface Props {
  series: Series;
  onBack: () => void;
}

export default function SeriesDetail({ series, onBack }: Props) {
  const credentials = useAuthStore((s) => s.credentials)!;
  const openPlayer = useIptvStore((s) => s.openPlayer);
  const [info, setInfo] = useState<SeriesInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    setLoading(true);
    getSeriesInfo(credentials, series.series_id)
      .then((data) => {
        setInfo(data);
        const seasons = Object.keys(data.episodes || {});
        if (seasons.length > 0) setSelectedSeason(seasons[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [credentials, series.series_id]);

  const handlePlayEpisode = (ep: Episode) => {
    const url = buildSeriesStreamUrl(credentials, ep.id, ep.container_extension || 'mp4');
    openPlayer(url, `${series.name} - S${ep.season}E${ep.episode_num} ${ep.title}`);
  };

  const seasons = info ? Object.keys(info.episodes || {}) : [];
  const episodes = info && selectedSeason ? info.episodes[selectedSeason] || [] : [];

  return (
    <div className="flex-1 overflow-y-auto page-enter">
      {/* Hero backdrop */}
      <div className="relative h-56 md:h-72 overflow-hidden">
        {(series.cover || series.backdrop_path?.[0]) && (
          <img
            src={series.backdrop_path?.[0] || series.cover}
            alt=""
            className="w-full h-full object-cover blur-sm scale-110 opacity-30"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/80 to-transparent" />
        <button
          onClick={onBack}
          className="absolute top-4 left-4 flex items-center gap-2 glass text-text-primary hover:text-accent px-3 py-2 rounded-xl transition z-10"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('series.back')}
        </button>
      </div>

      <div className="px-4 -mt-28 relative z-10 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          {/* Cover */}
          <div className="w-40 md:w-48 shrink-0 mx-auto md:mx-0">
            <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10">
              {series.cover ? (
                <img src={series.cover} alt={series.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-surface to-surface-lighter flex items-center justify-center">
                  <Film className="w-12 h-12 text-text-secondary/20" />
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 pt-2">
            <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-3">{series.name}</h1>
            <div className="flex flex-wrap gap-2 mb-4">
              {series.genre && (
                <span className="text-xs bg-surface-light px-3 py-1.5 rounded-full text-text-secondary">{series.genre}</span>
              )}
              {series.release_date && (
                <span className="flex items-center gap-1 text-xs bg-surface-light px-3 py-1.5 rounded-full text-text-secondary">
                  <Calendar className="w-3 h-3" /> {series.release_date}
                </span>
              )}
              {series.rating && Number(series.rating) > 0 && (
                <span className="flex items-center gap-1 text-xs bg-accent/15 px-3 py-1.5 rounded-full text-accent font-medium badge-glow">
                  <Star className="w-3 h-3 fill-accent" /> {Number(series.rating).toFixed(1)}
                </span>
              )}
              {seasons.length > 0 && (
                <span className="text-xs bg-surface-light px-3 py-1.5 rounded-full text-text-secondary">
                  {seasons.length} saison{seasons.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {series.plot && (
              <p className="text-text-secondary text-sm leading-relaxed mb-3">{series.plot}</p>
            )}
            {series.cast && (
              <p className="text-text-secondary text-xs">
                <span className="text-text-primary font-medium">{t('vod.cast')} : </span>
                {series.cast}
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 text-accent animate-spin" />
          </div>
        ) : (
          <>
            {/* Season tabs */}
            {seasons.length > 1 && (
              <div className="flex gap-2 mb-5 overflow-x-auto pb-2 scrollbar-hide">
                {seasons.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSeason(s)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                      selectedSeason === s
                        ? 'bg-gradient-to-r from-accent to-amber-600 text-black shadow-lg shadow-accent/20'
                        : 'glass text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {t('series.season')} {s}
                  </button>
                ))}
              </div>
            )}

            {/* Episodes */}
            <div className="space-y-2 pb-8 stagger-children">
              {episodes.map((ep, i) => (
                <button
                  key={ep.id}
                  onClick={() => handlePlayEpisode(ep)}
                  className="w-full flex items-center gap-4 p-4 glass rounded-xl transition-all group text-left card-hover"
                  style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
                >
                  <div className="w-11 h-11 bg-surface-lighter rounded-xl flex items-center justify-center shrink-0 group-hover:bg-accent/20 group-hover:scale-110 transition-all">
                    <Play className="w-4 h-4 text-text-secondary group-hover:text-accent transition" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-medium truncate group-hover:text-accent transition">
                      E{ep.episode_num}
                      {ep.title && ` — ${ep.title}`}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {ep.info?.duration && (
                        <span className="text-text-secondary text-[11px]">{ep.info.duration}</span>
                      )}
                      {ep.info?.rating && Number(ep.info.rating) > 0 && (
                        <span className="text-accent text-[11px] flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-accent" /> {Number(ep.info.rating).toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
