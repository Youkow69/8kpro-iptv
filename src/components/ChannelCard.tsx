import { useRef, memo } from 'react';
import { Star } from 'lucide-react';
import ChannelLogo from './ChannelLogo';
import DragonBallAura from './DragonBallAura';
import { useIptvStore } from '../store/iptvStore';
import { useIsTV } from '../hooks/useIsTV';
import { playClick, playFavoriteAdd, playFavoriteRemove } from '../services/sounds';

interface Props {
  stream: { stream_id: number; name: string; stream_icon?: string; epg_channel_id?: string };
  onClick: () => void;
  isLast?: boolean;
  index?: number;
}

export default memo(function ChannelCard({ stream, onClick, index }: Props) {
  const { favorites, toggleFavorite } = useIptvStore();
  const isFav = favorites.includes(stream.stream_id);
  const isTV = useIsTV();
  const ref = useRef<HTMLButtonElement>(null);

  return (
    <div
      ref={ref as any}
      onClick={() => { playClick(); onClick(); }}
      tabIndex={0}
      role="button"
      className={`w-full flex items-center text-left group relative channel-card cursor-pointer ${
        isTV ? 'gap-4 px-5 py-4' : 'gap-3 px-4 py-3'
      }`}
      onFocus={(e) => {
        if (isTV) e.currentTarget.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playClick(); onClick(); } }}
    >
      <span className={`text-text-secondary/25 font-mono shrink-0 tabular-nums ${isTV ? 'text-xs w-8' : 'text-[10px] w-6'}`}>
        {index !== undefined ? index + 1 : ''}
      </span>

      <div className={`relative shrink-0 ${isTV ? 'w-12 h-12' : 'w-9 h-9'}`}>
        {/* Dragon Ball aura behind logo */}
        <DragonBallAura streamId={stream.stream_id} size="xs" />
        <div className={`relative rounded-lg flex items-center justify-center overflow-hidden ${isTV ? 'w-12 h-12' : 'w-9 h-9'}`}
          style={{ zIndex: 1 }}
        >
          <ChannelLogo name={stream.name} size={isTV ? 'md' : 'sm'} />
          <div className="channel-logo-shine" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate channel-name-gradient ${isTV ? 'text-base' : 'text-sm'}`}>
          {stream.name}
        </p>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); isFav ? playFavoriteRemove() : playFavoriteAdd(); toggleFavorite(stream.stream_id); }}
        className={`rounded-lg transition-all shrink-0 ${
          isTV ? 'p-2.5' : 'p-1.5'
        } ${
          isFav
            ? 'text-amber-400'
            : 'text-white/20 hover:text-amber-400 focus-visible:text-amber-400 fav-star-touch opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
        }`}
      >
        <Star className={`${isTV ? 'w-5 h-5' : 'w-4 h-4'} ${isFav ? 'fill-amber-400' : ''}`} />
      </button>
    </div>
  );
})
