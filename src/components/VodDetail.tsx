import { useState } from 'react';
import { ArrowLeft, Play, Star, Calendar, Film, Users } from 'lucide-react';
import type { VodStream } from '../types/xtream';
import { useTranslation } from '../i18n/useTranslation';

interface Props {
  vod: VodStream;
  onBack: () => void;
  onPlay: () => void;
}

const PLOT_MAX = 200;

export default function VodDetail({ vod, onBack, onPlay }: Props) {
  const { t } = useTranslation();
  const [plotExpanded, setPlotExpanded] = useState(false);
  const isLongPlot = (vod.plot?.length ?? 0) > PLOT_MAX;

  return (
    <div className="flex-1 overflow-y-auto page-enter">
      {/* Hero backdrop */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        {vod.stream_icon && (
          <img src={vod.stream_icon} alt="" className="w-full h-full object-cover blur-sm scale-110 opacity-30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/80 to-transparent" />
        <button
          onClick={onBack}
          className="absolute top-4 left-4 flex items-center gap-2 glass text-text-primary hover:text-accent px-3 py-2 rounded-xl transition z-10"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('vod.back')}
        </button>
      </div>

      <div className="px-4 -mt-32 relative z-10 max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Poster */}
          <div className="w-44 md:w-56 shrink-0 mx-auto md:mx-0">
            <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10">
              {vod.stream_icon ? (
                <img src={vod.stream_icon} alt={vod.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-surface to-surface-lighter flex items-center justify-center">
                  <Film className="w-16 h-16 text-text-secondary/20" />
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 pt-2">
            <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-3">{vod.name}</h1>

            {/* Meta badges */}
            <div className="flex flex-wrap gap-2 mb-5">
              {vod.year && (
                <span className="flex items-center gap-1 text-xs bg-surface-light px-3 py-1.5 rounded-full text-text-secondary">
                  <Calendar className="w-3 h-3" /> {vod.year}
                </span>
              )}
              {vod.genre && (
                <span className="text-xs bg-surface-light px-3 py-1.5 rounded-full text-text-secondary">
                  {vod.genre}
                </span>
              )}
              {vod.rating && Number(vod.rating) > 0 && (
                <span className="flex items-center gap-1 text-xs bg-accent/15 px-3 py-1.5 rounded-full text-accent font-medium badge-glow">
                  <Star className="w-3 h-3 fill-accent" /> {Number(vod.rating).toFixed(1)}
                </span>
              )}
            </div>

            {/* Play button */}
            <button
              onClick={onPlay}
              className="bg-gradient-to-r from-accent to-amber-600 hover:from-accent-hover hover:to-amber-500 text-black font-bold px-8 py-3.5 rounded-xl transition-all flex items-center gap-2.5 shadow-lg shadow-accent/25 mb-6 card-hover"
            >
              <Play className="w-5 h-5 fill-black" />
              {t('vod.watch')}
            </button>

            {vod.plot && (
              <div className="mb-5">
                <h3 className="text-text-primary font-semibold text-sm mb-2">{t('vod.synopsis')}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  {isLongPlot && !plotExpanded ? vod.plot.slice(0, PLOT_MAX) + '…' : vod.plot}
                  {isLongPlot && (
                    <button
                      onClick={() => setPlotExpanded((e) => !e)}
                      className="ml-1 text-accent text-xs font-medium hover:underline"
                    >
                      {plotExpanded ? t('vod.showLess') : t('vod.showMore')}
                    </button>
                  )}
                </p>
              </div>
            )}

            {vod.cast && (
              <div className="mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Users className="w-3.5 h-3.5 text-accent" />
                  <h3 className="text-text-primary font-semibold text-sm">{t('vod.cast')}</h3>
                </div>
                <p className="text-text-secondary text-sm">{vod.cast}</p>
              </div>
            )}
            {vod.director && (
              <div>
                <h3 className="text-text-primary font-semibold text-sm mb-2">{t('vod.director')}</h3>
                <p className="text-text-secondary text-sm">{vod.director}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
