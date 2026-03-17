import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useIptvStore } from '../store/iptvStore';
import { getLiveCategories, getLiveStreams, buildLiveStreamUrl } from '../services/xtreamApi';
import CategoryList from '../components/CategoryList';
import ChannelCard from '../components/ChannelCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { Star } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { useIsTV } from '../hooks/useIsTV';

export default function LivePage() {
  const credentials = useAuthStore((s) => s.credentials)!;
  const {
    liveCategories, setLiveCategories,
    liveStreams, setLiveStreams,
    selectedLiveCategory, setSelectedLiveCategory,
    openPlayer, lastChannelId, setLastChannel,
    favorites,
  } = useIptvStore();
  const { t } = useTranslation();
  const isTV = useIsTV();

  const [loading, setLoading] = useState(false);
  const [loadingCats, setLoadingCats] = useState(false);
  const [search, setSearch] = useState('');
  const [showFavsOnly, setShowFavsOnly] = useState(false);

  useEffect(() => {
    if (liveCategories.length === 0) {
      setLoadingCats(true);
      getLiveCategories(credentials)
        .then((cats) => {
          setLiveCategories(cats);
          if (!selectedLiveCategory && cats.length > 0) {
            setSelectedLiveCategory(cats[0].category_id);
          }
        })
        .catch(console.error)
        .finally(() => setLoadingCats(false));
    }
  }, [credentials, liveCategories.length, setLiveCategories, selectedLiveCategory, setSelectedLiveCategory]);

  useEffect(() => {
    if (!selectedLiveCategory) return;
    setLoading(true);
    getLiveStreams(credentials, selectedLiveCategory)
      .then(setLiveStreams)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [credentials, selectedLiveCategory, setLiveStreams]);

  const filtered = liveStreams
    .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    .filter((s) => !showFavsOnly || favorites.includes(s.stream_id));

  const handlePlay = (stream: typeof liveStreams[0]) => {
    setLastChannel(stream.stream_id);
    const url = buildLiveStreamUrl(credentials, stream.stream_id);
    openPlayer(url, stream.name, stream.stream_id, 'live');
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 flex-1">
      <CategoryList
        categories={liveCategories}
        selected={selectedLiveCategory}
        onSelect={setSelectedLiveCategory}
        search={search}
        onSearch={setSearch}
        searchPlaceholder={t('live.search')}
        loading={loadingCats}
      />
      <div className="flex-1 bg-surface rounded-xl overflow-hidden flex flex-col max-h-[calc(100vh-100px)] md:max-h-[calc(100vh-32px)]">
        {/* Favorites filter bar */}
        <div className={`flex items-center gap-2 border-b border-surface-lighter ${isTV ? 'px-5 py-3' : 'px-4 py-2'}`}>
          <button
            onClick={() => setShowFavsOnly((s) => !s)}
            className={`flex items-center gap-1.5 rounded-lg font-medium transition ${
              isTV ? 'px-4 py-2 text-sm' : 'px-3 py-1.5 text-xs'
            } ${
              showFavsOnly
                ? 'bg-yellow-400/15 text-yellow-400'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-light focus-visible:text-text-primary focus-visible:bg-surface-light'
            }`}
          >
            <Star className={`${isTV ? 'w-5 h-5' : 'w-3.5 h-3.5'} ${showFavsOnly ? 'fill-yellow-400' : ''}`} />
            {t('live.favorites')}
          </button>
          <span className={`text-text-secondary ml-auto ${isTV ? 'text-sm' : 'text-xs'}`}>
            {filtered.length} {t('live.channels')}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading || loadingCats ? (
            <LoadingSpinner text={t('live.loading')} />
          ) : !selectedLiveCategory ? (
            <div className="flex items-center justify-center py-20 text-text-secondary">
              {t('live.selectCategory')}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-text-secondary">
              {showFavsOnly ? t('live.noFavorites') : t('live.noChannels')}
            </div>
          ) : (
            <div className="divide-y divide-surface-lighter">
              {filtered.map((stream) => (
                <ChannelCard
                  key={stream.stream_id}
                  stream={stream}
                  onClick={() => handlePlay(stream)}
                  isLast={stream.stream_id === lastChannelId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
