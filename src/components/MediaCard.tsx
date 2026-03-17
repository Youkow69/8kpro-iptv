import { useState, useRef, useCallback } from 'react';
import { useIsTV } from '../hooks/useIsTV';
import ChannelLogo from './ChannelLogo';

interface Props {
  title: string;
  image?: string;
  subtitle?: string;
  rating?: string;
  onClick: () => void;
}

export default function MediaCard({ title, image, subtitle, rating, onClick }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const isTV = useIsTV();
  const cardRef = useRef<HTMLButtonElement>(null);

  const handleFocus = useCallback(() => {
    if (isTV && cardRef.current) {
      cardRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isTV]);

  return (
    <button
      ref={cardRef}
      onClick={onClick}
      onFocus={handleFocus}
      className="group text-left rounded-xl overflow-hidden bg-surface hover:bg-surface-light focus-visible:bg-surface-light transition transform hover:scale-[1.02] hover:shadow-xl focus-visible:scale-[1.05] focus-visible:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="aspect-[2/3] bg-surface-lighter relative overflow-hidden">
        {image && !imgFailed ? (
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface to-surface-lighter">
            <ChannelLogo name={title} size="lg" />
          </div>
        )}
        {rating && Number(rating) > 0 && (
          <span className={`absolute top-2 right-2 bg-black/70 text-yellow-400 px-2 py-0.5 rounded-md font-medium ${
            isTV ? 'text-sm' : 'text-xs'
          }`}>
            ★ {Number(rating).toFixed(1)}
          </span>
        )}
      </div>
      <div className={isTV ? 'p-4' : 'p-3'}>
        <p className={`text-text-primary font-medium truncate group-hover:text-accent group-focus-visible:text-accent transition ${
          isTV ? 'text-base' : 'text-sm'
        }`}>
          {title}
        </p>
        {subtitle && (
          <p className={`text-text-secondary mt-1 truncate ${isTV ? 'text-sm' : 'text-xs'}`}>{subtitle}</p>
        )}
      </div>
    </button>
  );
}
