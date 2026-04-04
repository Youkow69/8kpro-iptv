import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useIptvStore } from '../store/iptvStore';
import { getVodCategories, getVodStreams, buildVodStreamUrl } from '../services/xtreamApi';
import CategoryList from '../components/CategoryList';
import MediaCard from '../components/MediaCard';
import LoadingSpinner from '../components/LoadingSpinner';
import SkeletonGrid from '../components/SkeletonGrid';
import VodDetail from '../components/VodDetail';
import type { VodStream } from '../types/xtream';
import { useTranslation } from '../i18n/useTranslation';
import { useIsTV } from '../hooks/useIsTV';
import { ArrowUpDown, Film, Search as SearchIcon } from 'lucide-react';
import { playClick } from '../services/sounds';
import { useDebounce } from '../hooks/useDebounce';
import ScrollToTop from '../components/ScrollToTop';

type SortMode = 'default' | 'name' | 'rating' | 'year';

export default function VodPage() {
  const credentials = useAuthStore((s) => s.credentials)!;
  const {
    vodCategories, setVodCategories,
    vodStreams, setVodStreams,
    selectedVodCategory, setSelectedVodCategory,
    openPlayer,
  } = useIptvStore();
  const { t } = useTranslation();
  const isTV = useIsTV();

  const [loading, setLoading] = useState(false);
  const [loadingCats, setLoadingCats] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedVod, setSelectedVod] = useState<VodStream | null>(null);
  const [sort, setSort] = useState<SortMode>('default');
  const [visibleCount, setVisibleCount] = useState(50);
  const debouncedSearch = useDebounce(search, 200);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (vodCategories.length === 0) {
      setLoadingCats(true);
      getVodCategories(credentials)
        .then((cats) => {
          setVodCategories(cats);
          if (!selectedVodCategory && cats.length > 0) {
            setSelectedVodCategory(cats[0].category_id);
          }
        })
        .catch(console.error)
        .finally(() => setLoadingCats(false));
    }
  }, [credentials, vodCategories.length, setVodCategories, selectedVodCategory, setSelectedVodCategory]);

  useEffect(() => {
    if (selectedVodCategory === null && vodCategories.length === 0) return;
    setLoading(true);
    setVisibleCount(50);
    getVodStreams(credentials, selectedVodCategory ?? undefined)
      .then(setVodStreams)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [credentials, selectedVodCategory, setVodStreams, vodCategories.length]);

  let filtered = vodStreams.filter((v) =>
    v.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  if (sort === 'name') filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'rating') filtered = [...filtered].sort((a, b) => (parseFloat(b.rating || '0') - parseFloat(a.rating || '0')));
  else if (sort === 'year') filtered = [...filtered].sort((a, b) => (b.year || '').localeCompare(a.year || ''));

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const handlePlay = (vod: VodStream) => {
    const url = buildVodStreamUrl(credentials, vod.stream_id, vod.container_extension || 'mp4');
    openPlayer(url, vod.name);
  };

  if (selectedVod) {
    return (
      <VodDetail
        vod={selectedVod}
        onBack={() => setSelectedVod(null)}
        onPlay={() => handlePlay(selectedVod)}
      />
    );
  }

  const sortOptions: { id: SortMode; label: string }[] = [
    { id: 'default', label: t('sort.default') },
    { id: 'name', label: 'A-Z' },
    { id: 'rating', label: t('sort.rating') },
    { id: 'year', label: t('sort.year') },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 flex-1 page-enter">
      <CategoryList
        categories={vodCategories}
        selected={selectedVodCategory}
        onSelect={setSelectedVodCategory}
        search={search}
        onSearch={setSearch}
        searchPlaceholder={t('vod.search')}
        loading={loadingCats}
      />
      <div ref={scrollRef} className="flex-1 overflow-y-auto max-h-[calc(100vh-100px)] md:max-h-[calc(100vh-32px)]">
        {/* Sort bar */}
        <div className="flex items-center gap-2 mb-4 px-1">
          <ArrowUpDown className="w-3.5 h-3.5 text-text-secondary/40" />
          <div className="flex gap-1 bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.03]">
            {sortOptions.map((s) => (
              <button
                key={s.id}
                onClick={() => { playClick(); setSort(s.id); }}
                className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
                  sort === s.id ? 'bg-accent text-black shadow-sm' : 'text-text-secondary/50 hover:text-text-primary'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <span className="ml-auto text-text-secondary/40 text-xs flex items-center gap-1 font-medium">
            <Film className="w-3 h-3" /> {filtered.length}
          </span>
        </div>

        {loading ? (
          <SkeletonGrid count={15} type="poster" />
        ) : loadingCats ? (
          <LoadingSpinner text={t('vod.loading')} />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-secondary/50 gap-3">
            {debouncedSearch ? <SearchIcon className="w-10 h-10 text-text-secondary/20" /> : <Film className="w-10 h-10 text-text-secondary/20" />}
            <p>{t('vod.noResults')}</p>
          </div>
        ) : (
          <div className={`grid gap-3 stagger-children ${
            isTV ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
          }`}>
            {visible.map((vod) => (
              <MediaCard
                key={vod.stream_id}
                name={vod.name}
                image={vod.stream_icon}
                rating={vod.rating}
                onClick={() => { playClick(); setSelectedVod(vod); }}
              />
            ))}
            {hasMore && (
              <button onClick={() => setVisibleCount((c) => c + 50)} className="col-span-full py-3 text-sm text-accent hover:text-accent/80 font-medium">
                Charger plus ({filtered.length - visibleCount} restants)
              </button>
            )}
          </div>
        )}
      </div>
      <ScrollToTop scrollRef={scrollRef} />
    </div>
  );
}
