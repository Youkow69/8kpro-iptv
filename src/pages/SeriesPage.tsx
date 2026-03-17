import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useIptvStore } from '../store/iptvStore';
import { getSeriesCategories, getSeriesList } from '../services/xtreamApi';
import CategoryList from '../components/CategoryList';
import MediaCard from '../components/MediaCard';
import LoadingSpinner from '../components/LoadingSpinner';
import SeriesDetail from '../components/SeriesDetail';
import type { Series } from '../types/xtream';
import { useTranslation } from '../i18n/useTranslation';

export default function SeriesPage() {
  const credentials = useAuthStore((s) => s.credentials)!;
  const {
    seriesCategories, setSeriesCategories,
    seriesList, setSeriesList,
    selectedSeriesCategory, setSelectedSeriesCategory,
  } = useIptvStore();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [loadingCats, setLoadingCats] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);

  useEffect(() => {
    if (seriesCategories.length === 0) {
      setLoadingCats(true);
      getSeriesCategories(credentials)
        .then((cats) => {
          setSeriesCategories(cats);
          if (!selectedSeriesCategory && cats.length > 0) {
            setSelectedSeriesCategory(cats[0].category_id);
          }
        })
        .catch(console.error)
        .finally(() => setLoadingCats(false));
    }
  }, [credentials, seriesCategories.length, setSeriesCategories, selectedSeriesCategory, setSelectedSeriesCategory]);

  useEffect(() => {
    if (!selectedSeriesCategory) return;
    setLoading(true);
    getSeriesList(credentials, selectedSeriesCategory)
      .then(setSeriesList)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [credentials, selectedSeriesCategory, setSeriesList]);

  const filtered = seriesList.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedSeries) {
    return <SeriesDetail series={selectedSeries} onBack={() => setSelectedSeries(null)} />;
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 flex-1">
      <CategoryList
        categories={seriesCategories}
        selected={selectedSeriesCategory}
        onSelect={setSelectedSeriesCategory}
        search={search}
        onSearch={setSearch}
        searchPlaceholder={t('series.search')}
        loading={loadingCats}
      />
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-100px)] md:max-h-[calc(100vh-32px)]">
        {loading || loadingCats ? (
          <LoadingSpinner text={t('series.loading')} />
        ) : !selectedSeriesCategory ? (
          <div className="flex items-center justify-center py-20 text-text-secondary">
            {t('live.selectCategory')}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-text-secondary">
            {t('series.noResults')}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((s) => (
              <MediaCard
                key={s.series_id}
                title={s.name}
                image={s.cover}
                subtitle={[s.genre, s.release_date].filter(Boolean).join(' • ')}
                rating={s.rating}
                onClick={() => setSelectedSeries(s)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
