import { ArrowLeft, Play } from 'lucide-react';
import type { VodStream } from '../types/xtream';
import { useTranslation } from '../i18n/useTranslation';

interface Props {
  vod: VodStream;
  onBack: () => void;
  onPlay: () => void;
}

export default function VodDetail({ vod, onBack, onPlay }: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        {t('vod.back')}
      </button>

      <div className="flex flex-col md:flex-row gap-8 max-w-4xl">
        <div className="w-full md:w-72 shrink-0">
          <div className="aspect-[2/3] rounded-xl overflow-hidden bg-surface-lighter">
            {vod.stream_icon ? (
              <img src={vod.stream_icon} alt={vod.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-secondary text-4xl font-bold">
                {vod.name.charAt(0)}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1">
          <h1 className="text-3xl font-bold text-text-primary mb-2">{vod.name}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-text-secondary mb-4">
            {vod.year && <span>{vod.year}</span>}
            {vod.genre && <span>{vod.genre}</span>}
            {vod.rating && Number(vod.rating) > 0 && (
              <span className="text-yellow-400">★ {Number(vod.rating).toFixed(1)}</span>
            )}
          </div>

          <button
            onClick={onPlay}
            className="bg-accent hover:bg-accent-hover text-white font-semibold px-6 py-3 rounded-xl transition flex items-center gap-2 mb-6"
          >
            <Play className="w-5 h-5" />
            {t('vod.watch')}
          </button>

          {vod.plot && (
            <div className="mb-4">
              <h3 className="text-text-primary font-medium mb-2">{t('vod.synopsis')}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{vod.plot}</p>
            </div>
          )}
          {vod.cast && (
            <div className="mb-4">
              <h3 className="text-text-primary font-medium mb-2">{t('vod.cast')}</h3>
              <p className="text-text-secondary text-sm">{vod.cast}</p>
            </div>
          )}
          {vod.director && (
            <div>
              <h3 className="text-text-primary font-medium mb-2">{t('vod.director')}</h3>
              <p className="text-text-secondary text-sm">{vod.director}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
