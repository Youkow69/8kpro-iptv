import { useState, useRef, useCallback } from 'react';
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

export default function MediaCard({ name, image, rating, onClick }: Props) {
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
      className={`group relative rounded-xl overflow-hidden transition-all poster-tilt focus-visible:ring-2 focus-visible:ring-accent aspect-[2/3]`}
    >
      {/* Image / Skeleton */}
      {image && !imgError ? (
        <>
          {!imgLoaded && <div className="absolute inset-0 skeleton" />}
          <img
            src={image}
            alt={name}
            className={`w-full h-full object-cover transition-all duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'} group-hover:scale-110`}
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
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

      {/* Play button on hover */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all">
        <div className="w-14 h-14 rounded-full bg-accent/90 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-accent/30 transform scale-75 group-hover:scale-100 transition-transform">
          <Play className="w-7 h-7 text-black fill-black ml-0.5" />
        </div>
      </div>

      {/* Rating badge */}
      {rating && parseFloat(rating) > 0 && (
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-accent text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 badge-glow">
          <Star className="w-3 h-3 fill-accent" />
          {parseFloat(rating).toFixed(1)}
        </div>
      )}

      {/* Title */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className={`text-white font-semibold truncate ${isTV ? 'text-sm' : 'text-xs'}`}>
          {name}
        </p>
      </div>
    </button>
  );
}
