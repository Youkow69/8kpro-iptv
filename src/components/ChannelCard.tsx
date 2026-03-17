import { Star } from 'lucide-react';
import type { LiveStream } from '../types/xtream';
import { useIptvStore } from '../store/iptvStore';
import { useTranslation } from '../i18n/useTranslation';
import ChannelLogo from './ChannelLogo';

interface Props {
  stream: LiveStream;
  onClick: () => void;
  isLast?: boolean;
}

export default function ChannelCard({ stream, onClick, isLast }: Props) {
  const { favorites, toggleFavorite } = useIptvStore();
  const { t } = useTranslation();
  const isFav = favorites.includes(stream.stream_id);

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-surface-light transition group">
      <button
        onClick={onClick}
        className="flex-1 flex items-center gap-3 text-left min-w-0"
      >
        <ChannelLogo name={stream.name} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-text-primary text-sm font-medium truncate group-hover:text-accent transition">
            {stream.name}
          </p>
        </div>
      </button>
      <div className="flex items-center gap-2 shrink-0">
        {isLast && (
          <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full">
            {t('live.last')}
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(stream.stream_id);
          }}
          className={`p-1.5 rounded-lg transition ${
            isFav
              ? 'text-yellow-400'
              : 'text-text-secondary/30 hover:text-yellow-400 opacity-0 group-hover:opacity-100'
          }`}
          title={isFav ? t('removeFavorite') : t('addFavorite')}
        >
          <Star className={`w-4 h-4 ${isFav ? 'fill-yellow-400' : ''}`} />
        </button>
      </div>
    </div>
  );
}
