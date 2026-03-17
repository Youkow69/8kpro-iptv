import { useEffect, useState } from 'react';
import { ArrowLeft, Play, Loader2 } from 'lucide-react';
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
    <div className="flex-1 p-4 overflow-y-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        {t('series.back')}
      </button>

      <div className="flex flex-col md:flex-row gap-8 max-w-5xl mb-8">
        <div className="w-full md:w-60 shrink-0">
          <div className="aspect-[2/3] rounded-xl overflow-hidden bg-surface-lighter">
            {series.cover ? (
              <img src={series.cover} alt={series.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-secondary text-4xl font-bold">
                {series.name.charAt(0)}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-text-primary mb-2">{series.name}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-text-secondary mb-4">
            {series.genre && <span>{series.genre}</span>}
            {series.release_date && <span>{series.release_date}</span>}
            {series.rating && Number(series.rating) > 0 && (
              <span className="text-yellow-400">★ {Number(series.rating).toFixed(1)}</span>
            )}
          </div>
          {series.plot && (
            <p className="text-text-secondary text-sm leading-relaxed mb-4">{series.plot}</p>
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
          {seasons.length > 1 && (
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {seasons.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSeason(s)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                    selectedSeason === s
                      ? 'bg-accent text-white'
                      : 'bg-surface-light text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {t('series.season')} {s}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {episodes.map((ep) => (
              <button
                key={ep.id}
                onClick={() => handlePlayEpisode(ep)}
                className="w-full flex items-center gap-4 p-4 bg-surface hover:bg-surface-light rounded-xl transition group text-left"
              >
                <div className="w-10 h-10 bg-surface-lighter rounded-lg flex items-center justify-center shrink-0 group-hover:bg-accent/20">
                  <Play className="w-4 h-4 text-text-secondary group-hover:text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm font-medium truncate">
                    {t('series.episode')} {ep.episode_num}
                    {ep.title && ` — ${ep.title}`}
                  </p>
                  {ep.info?.duration && (
                    <p className="text-text-secondary text-xs mt-0.5">{ep.info.duration}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
