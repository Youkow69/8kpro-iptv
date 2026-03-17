import { useRef, useCallback } from 'react';
import { Star } from 'lucide-react';
import type { LiveStream } from '../types/xtream';
import { useIptvStore } from '../store/iptvStore';
import { useTranslation } from '../i18n/useTranslation';
import { useIsTV } from '../hooks/useIsTV';
import ChannelLogo from './ChannelLogo';

interface Props {
  stream: LiveStream;
  onClick: () => void;
  isLast?: boolean;
}

export default function ChannelCard({ stream, onClick, isLast }: Props) {
  const { favorites, toggleFavorite } = useIptvStore();
  const { t } = useTranslation();
  const isTV = useIsTV();
  const isFav = favorites.includes(stream.stream_id);
  const rowRef = useRef<HTMLDivElement>(null);

  // Auto-scroll into view when focused (D-pad / keyboard navigation)
  const handleFocus = useCallback(() => {
    if (rowRef.current) {
      rowRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, []);

  // Pressing Enter/OK plays the channel
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  }, [onClick]);

  return (
    <div
      ref={rowRef}
      tabIndex={0}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      onClick={onClick}
      className={`flex items-center gap-3 hover:bg-surface-light focus:bg-accent/10 focus:outline-none transition group cursor-pointer ${
        isTV ? 'px-5 py-4' : 'px-4 py-3'
      }`}
    >
      <ChannelLogo name={stream.name} size={isTV ? 'lg' : 'md'} />
      <div className="flex-1 min-w-0">
        <p className={`text-text-primary font-medium truncate group-hover:text-accent group-focus:text-accent transition ${
          isTV ? 'text-lg' : 'text-sm'
        }`}>
          {stream.name}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isLast && (
          <span className={`bg-accent/20 text-accent px-2 py-0.5 rounded-full ${
            isTV ? 'text-sm' : 'text-[10px]'
          }`}>
            {t('live.last')}
          </span>
        )}
        <button
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(stream.stream_id);
          }}
          className={`rounded-lg transition ${
            isTV ? 'p-3' : 'p-1.5'
          } ${
            isFav
              ? 'text-yellow-400'
              : 'text-text-secondary/30 hover:text-yellow-400 opacity-0 group-hover:opacity-100 group-focus:opacity-100'
          }`}
          title={isFav ? t('removeFavorite') : t('addFavorite')}
        >
          <Star className={`${isTV ? 'w-6 h-6' : 'w-4 h-4'} ${isFav ? 'fill-yellow-400' : ''}`} />
        </button>
      </div>
    </div>
  );
}
