import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useIptvStore } from '../store/iptvStore';
import { getVodCategories, getVodStreams, buildVodStreamUrl } from '../services/xtreamApi';
import CategoryList from '../components/CategoryList';
import MediaCard from '../components/MediaCard';
import LoadingSpinner from '../components/LoadingSpinner';
import VodDetail from '../components/VodDetail';
import type { VodStream } from '../types/xtream';
import { useTranslation } from '../i18n/useTranslation';
import { useIsTV } from '../hooks/useIsTV';
import { ArrowUpDown, Film } from 'lucide-react';
import { playClick } from '../services/sounds';

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
    if (!selectedVodCategory) return;
    setLoading(true);
    getVodStreams(credentials, selectedVodCategory)
      .then(setVodStreams)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [credentials, selectedVodCategory, setVodStreams]);

  let filtered = vodStreams.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase())
  );

  // Sort
  if (sort === 'name') filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'rating') filtered = [...filtered].sort((a, b) => (parseFloat(b.rating || '0') - parseFloat(a.rating || '0')));
  else if (sort === 'year') filtered = [...filtered].sort((a, b) => (b.year || '').localeCompare(a.year || ''));

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
    { id: 'default', label: 'Defaut' },
    { id: 'name', label: 'A-Z' },
    { id: 'rating', label: 'Note' },
    { id: 'year', label: 'Annee' },
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
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-100px)] md:max-h-[calc(100vh-32px)]">
        {/* Sort bar */}
        <div className="flex items-center gap-2 mb-4 px-1">
          <ArrowUpDown className="w-3.5 h-3.5 text-text-secondary" />
          <div className="flex gap-1 bg-surface-light/50 rounded-lg p-0.5">
            {sortOptions.map((s) => (
              <button
                key={s.id}
                onClick={() => { playClick(); setSort(s.id); }}
                className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
                  sort === s.id ? 'bg-accent text-black' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <span className="ml-auto text-text-secondary text-xs flex items-center gap-1">
            <Film className="w-3 h-3" /> {filtered.length}
          </span>
        </div>

        {loading || loadingCats ? (
          <LoadingSpinner text={t('vod.loading')} />
        ) : !selectedVodCategory ? (
          <div className="flex items-center justify-center py-20 text-text-secondary">
            {t('live.selectCategory')}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-text-secondary">
            {t('vod.noResults')}
          </div>
        ) : (
          <div className={`grid gap-3 stagger-children ${
            isTV ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
          }`}>
            {filtered.map((vod) => (
              <MediaCard
                key={vod.stream_id}
                name={vod.name}
                image={vod.stream_icon}
                rating={vod.rating}
                onClick={() => { playClick(); setSelectedVod(vod); }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
