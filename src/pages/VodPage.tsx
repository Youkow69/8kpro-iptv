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

  const filtered = vodStreams.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase())
  );

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

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 flex-1">
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
          <div className={`grid gap-4 ${
            isTV ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
          }`}>
            {filtered.map((vod) => (
              <MediaCard
                key={vod.stream_id}
                title={vod.name}
                image={vod.stream_icon}
                subtitle={[vod.genre, vod.year].filter(Boolean).join(' • ')}
                rating={vod.rating}
                onClick={() => setSelectedVod(vod)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
