import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useIptvStore } from '../store/iptvStore';
import { getSeriesCategories, getSeriesList } from '../services/xtreamApi';
import CategoryList from '../components/CategoryList';
import MediaCard from '../components/MediaCard';
import LoadingSpinner from '../components/LoadingSpinner';
import SkeletonGrid from '../components/SkeletonGrid';
import SeriesDetail from '../components/SeriesDetail';
import type { Series } from '../types/xtream';
import { useTranslation } from '../i18n/useTranslation';
import { useIsTV } from '../hooks/useIsTV';
import { ArrowUpDown, Clapperboard, Search as SearchIcon } from 'lucide-react';
import { playClick } from '../services/sounds';
import { useDebounce } from '../hooks/useDebounce';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import ScrollToTop from '../components/ScrollToTop';

type SortMode = 'default' | 'name' | 'rating';

export default function SeriesPage() {
  const credentials = useAuthStore((s) => s.credentials)!;
  const {
    seriesCategories, setSeriesCategories,
    seriesList, setSeriesList,
    selectedSeriesCategory, setSelectedSeriesCategory,
  } = useIptvStore();
  const { t } = useTranslation();
  const isTV = useIsTV();

  const [loading, setLoading] = useState(false);
  const [loadingCats, setLoadingCats] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const [sort, setSort] = useState<SortMode>('default');
  const debouncedSearch = useDebounce(search, 200);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (seriesCategories.length === 0) {
      setLoadingCats(true);
      getSeriesCategories(credentials)
        .then((cats) => {
          setSeriesCategories(cats);
          if (selectedSeriesCategory) {
            if (!cats.some((c) => c.category_id === selectedSeriesCategory)) {
              setSelectedSeriesCategory(cats[0]?.category_id ?? null);
            }
          } else if (cats.length > 0) {
            setSelectedSeriesCategory(cats[0].category_id);
          }
        })
        .catch(console.error)
        .finally(() => setLoadingCats(false));
    }
  }, [credentials, seriesCategories.length, setSeriesCategories, selectedSeriesCategory, setSelectedSeriesCategory]);

  useEffect(() => {
    if (selectedSeriesCategory === null && seriesCategories.length === 0) return;
    setLoading(true);
    reset();
    getSeriesList(credentials, selectedSeriesCategory ?? undefined)
      .then(setSeriesList)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [credentials, selectedSeriesCategory, setSeriesList, seriesCategories.length]);

  let filtered = seriesList.filter((s) =>
    s.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  if (sort === 'name') filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'rating') filtered = [...filtered].sort((a, b) => (parseFloat(b.rating || '0') - parseFloat(a.rating || '0')));

  const { visibleCount, reset, sentinelRef, hasMore } = useInfiniteScroll(filtered.length);
  const visible = filtered.slice(0, visibleCount);

  if (selectedSeries) {
    return <SeriesDetail series={selectedSeries} onBack={() => setSelectedSeries(null)} />;
  }

  const sortOptions: { id: SortMode; label: string }[] = [
    { id: 'default', label: t('sort.default') },
    { id: 'name', label: 'A-Z' },
    { id: 'rating', label: t('sort.rating') },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 flex-1 page-enter">
      <CategoryList
        categories={seriesCategories}
        selected={selectedSeriesCategory}
        onSelect={setSelectedSeriesCategory}
        search={search}
        onSearch={setSearch}
        searchPlaceholder={t('series.search')}
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
            <Clapperboard className="w-3 h-3" /> {filtered.length}
          </span>
        </div>

        {loading ? (
          <SkeletonGrid count={15} type="poster" />
        ) : loadingCats ? (
          <LoadingSpinner text={t('series.loading')} />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-secondary/50 gap-3">
            {debouncedSearch ? <SearchIcon className="w-10 h-10 text-text-secondary/20" /> : <Clapperboard className="w-10 h-10 text-text-secondary/20" />}
            <p>{t('series.noResults')}</p>
          </div>
        ) : (
          <div className={`grid gap-3 stagger-grid ${
            isTV ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
          }`}>
            {visible.map((s) => (
              <MediaCard
                key={s.series_id}
                name={s.name}
                image={s.cover}
                rating={s.rating}
                onClick={() => { playClick(); setSelectedSeries(s); }}
              />
            ))}
            {hasMore && <div ref={sentinelRef} className="col-span-full h-10" />}
          </div>
        )}
      </div>
      <ScrollToTop scrollRef={scrollRef} />
    </div>
  );
}
