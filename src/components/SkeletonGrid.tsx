import { useIsTV } from '../hooks/useIsTV';

export default function SkeletonGrid({ count = 12, type = 'poster' }: { count?: number; type?: 'poster' | 'channel' }) {
  const isTV = useIsTV();

  if (type === 'channel') {
    return (
      <div className="divide-y divide-white/[0.03]">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={`flex items-center gap-3 ${isTV ? 'px-5 py-4' : 'px-4 py-3'}`}>
            <div className={`rounded-lg skeleton shrink-0 ${isTV ? 'w-12 h-12' : 'w-9 h-9'}`} />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3.5 rounded w-3/4" />
              <div className="skeleton h-2.5 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid gap-3 p-4 ${
      isTV ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
    }`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="aspect-[2/3] rounded-xl skeleton border border-white/[0.04]" />
      ))}
    </div>
  );
}
