import { useState, useRef, useCallback, memo } from 'react';
import { useIsTV } from '../hooks/useIsTV';
import ChannelLogo from './ChannelLogo';
import { Play, Star } from 'lucide-react';
import { playClick } from '../services/sounds';

interface Props {
  name: string;
  image?: string;
  rating?: string;
  onClick: () => void;
}

export default memo(function MediaCard({ name, image, rating, onClick }: Props) {
  const isTV = useIsTV();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  const onFocus = useCallback(() => {
    if (isTV && ref.current) {
      ref.current.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }
  }, [isTV]);

  return (
    <button
      ref={ref}
      onClick={() => { playClick(); onClick(); }}
      onFocus={onFocus}
      className="group relative rounded-xl overflow-hidden transition-all poster-tilt focus-visible:ring-2 focus-visible:ring-accent aspect-[2/3] border border-white/[0.04]"
    >
      {/* Image / Skeleton */}
      {image && !imgError ? (
        <>
          {!imgLoaded && <div className="absolute inset-0 skeleton" />}
          <img
            src={image}
            alt={name}
            className={`w-full h-full object-cover transition-all duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'} group-hover:scale-105`}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        </>
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-surface via-surface-light to-surface-lighter flex items-center justify-center">
          <ChannelLogo name={name} size="lg" />
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

      {/* Hover overlay */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-300">
        <div className="absolute inset-0 bg-black/40" />
        <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center shadow-lg shadow-accent/25 transform scale-75 group-hover:scale-100 transition-transform duration-300 relative z-10">
          <Play className="w-6 h-6 text-black fill-black ml-0.5" />
        </div>
      </div>

      {/* Rating badge */}
      {rating && parseFloat(rating) > 0 && (
        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md text-accent text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border border-white/[0.08]">
          <Star className="w-3 h-3 fill-accent" />
          {parseFloat(rating).toFixed(1)}
        </div>
      )}

      {/* Title */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className={`font-semibold truncate drop-shadow-lg channel-name-gradient ${isTV ? 'text-sm' : 'text-xs'}`}>
          {name}
        </p>
      </div>
    </button>
  );
})
