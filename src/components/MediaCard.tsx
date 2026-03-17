import { useState } from 'react';
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

  return (
    <button
      onClick={onClick}
      className="group text-left rounded-xl overflow-hidden bg-surface hover:bg-surface-light transition transform hover:scale-[1.02] hover:shadow-xl"
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
          <span className="absolute top-2 right-2 bg-black/70 text-yellow-400 text-xs px-2 py-0.5 rounded-md font-medium">
            ★ {Number(rating).toFixed(1)}
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="text-text-primary text-sm font-medium truncate group-hover:text-accent transition">
          {title}
        </p>
        {subtitle && (
          <p className="text-text-secondary text-xs mt-1 truncate">{subtitle}</p>
        )}
      </div>
    </button>
  );
}
