import { useRef, useMemo, memo } from 'react';
import { Star } from 'lucide-react';
import ChannelLogo from './ChannelLogo';
import DragonBallAura from './DragonBallAura';
import { useIptvStore } from '../store/iptvStore';
import { useIsTV } from '../hooks/useIsTV';
import { playClick, playFavoriteAdd, playFavoriteRemove } from '../services/sounds';

/** Extract quality tag from channel name */
export function getQualityBadge(name: string): { label: string; color: string } | null {
  const n = name.toLowerCase();
  if (n.includes('⁸ᴷ') || n.includes('8k')) return { label: '8K', color: 'bg-purple-500/20 text-purple-300' };
  if (n.includes('³⁸⁴⁰') || n.includes('3840')) return { label: '4K', color: 'bg-amber-500/20 text-amber-300' };
  if (n.includes('⁴ᴷ') || n.includes('4k')) return { label: '4K', color: 'bg-amber-500/20 text-amber-300' };
  if (n.includes('ᵁᴴᴰ') || n.includes('uhd')) return { label: 'UHD', color: 'bg-orange-500/20 text-orange-300' };
  if (n.includes('ᶠᴴᴰ') || n.includes('fhd') || n.includes('1080')) return { label: 'FHD', color: 'bg-blue-500/20 text-blue-300' };
  if (n.includes('ʰᵉᵛᶜ') || n.includes('hevc') || n.includes('h265')) return { label: 'HEVC', color: 'bg-teal-500/20 text-teal-300' };
  if (n.includes('ᴿᴬᵂ') || n.includes('raw')) return { label: 'RAW', color: 'bg-slate-500/20 text-slate-300' };
  if (n.includes('ᴴᴰ') || n.includes(' hd')) return { label: 'HD', color: 'bg-sky-500/20 text-sky-300' };
  return null;
}

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
  const quality = useMemo(() => getQualityBadge(stream.name), [stream.name]);

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
        <div className="flex items-center gap-1.5">
          <p className={`font-medium truncate channel-name-gradient ${isTV ? 'text-base' : 'text-sm'}`}>
            {stream.name}
          </p>
          {quality && (
            <span className={`shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded ${quality.color}`}>
              {quality.label}
            </span>
          )}
        </div>
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
        <Star className={`${isTV ? 'w-5 h-5' : 'w-4 h-4'} ${isFav ? 'fill-amber-400 fav-active' : ''}`} />
      </button>
    </div>
  );
})
