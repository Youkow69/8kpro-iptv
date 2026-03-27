import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { useIptvStore } from '../store/iptvStore';
import { getLiveCategories, getLiveStreams, buildLiveStreamUrl } from '../services/xtreamApi';
import CategoryList from '../components/CategoryList';
import ChannelCard from '../components/ChannelCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { Star, LayoutGrid, List } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { useIsTV } from '../hooks/useIsTV';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { playClick } from '../services/sounds';
import ChannelLogo from '../components/ChannelLogo';

export default function LivePage() {
  const credentials = useAuthStore((s) => s.credentials)!;
  const {
    liveCategories, setLiveCategories,
    liveStreams, setLiveStreams,
    selectedLiveCategory, setSelectedLiveCategory,
    openPlayer, lastChannelId, setLastChannel,
    favorites, addSearchHistory,
  } = useIptvStore();
  const { t } = useTranslation();
  const isTV = useIsTV();

  const [loading, setLoading] = useState(false);
  const [loadingCats, setLoadingCats] = useState(false);
  const [search, setSearch] = useState('');
  const [showFavsOnly, setShowFavsOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Pull to refresh - reload categories and streams
  const handleRefresh = useCallback(async () => {
    try {
      const cats = await getLiveCategories(credentials);
      setLiveCategories(cats);
      if (selectedLiveCategory) {
        const streams = await getLiveStreams(credentials, selectedLiveCategory);
        setLiveStreams(streams);
      }
    } catch {}
  }, [credentials, selectedLiveCategory]);
  const refreshing = usePullToRefresh(handleRefresh);

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
    playClick();
    if (search.trim()) addSearchHistory(search.trim());
    setLastChannel(stream.stream_id);
    const url = buildLiveStreamUrl(credentials, stream.stream_id);
    openPlayer(url, stream.name, stream.stream_id, 'live');
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 flex-1 page-enter">
      {refreshing && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <CategoryList
        categories={liveCategories}
        selected={selectedLiveCategory}
        onSelect={setSelectedLiveCategory}
        search={search}
        onSearch={setSearch}
        searchPlaceholder={t('live.search')}
        loading={loadingCats}
      />
      <div className="flex-1 glass rounded-xl overflow-hidden flex flex-col max-h-[calc(100vh-100px)] md:max-h-[calc(100vh-32px)]">
        {/* Filter bar */}
        <div className={`flex items-center gap-2 border-b border-white/5 ${isTV ? 'px-5 py-3' : 'px-4 py-2.5'}`}>
          <button
            onClick={() => { playClick(); setShowFavsOnly((s) => !s); }}
            className={`flex items-center gap-1.5 rounded-xl font-medium transition-all ${
              isTV ? 'px-4 py-2 text-sm' : 'px-3 py-1.5 text-xs'
            } ${
              showFavsOnly
                ? 'bg-yellow-400/15 text-yellow-400 shadow-sm shadow-yellow-400/10'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-light'
            }`}
          >
            <Star className={`${isTV ? 'w-5 h-5' : 'w-3.5 h-3.5'} ${showFavsOnly ? 'fill-yellow-400' : ''}`} />
            {t('live.favorites')}
          </button>

          {/* View mode toggle */}
          <div className="flex items-center bg-surface-light/50 rounded-lg p-0.5 ml-2">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-accent text-black' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-accent text-black' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

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
          ) : viewMode === 'list' ? (
            <div className="divide-y divide-white/5 stagger-list">
              {filtered.map((stream, i) => (
                <ChannelCard
                  key={stream.stream_id}
                  stream={stream}
                  onClick={() => handlePlay(stream)}
                  isLast={stream.stream_id === lastChannelId}
                  index={i}
                />
              ))}
            </div>
          ) : (
            /* Grid view */
            <div className={`grid gap-3 p-4 ${
              isTV ? 'grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
            }`}>
              {filtered.map((stream) => (
                <button
                  key={stream.stream_id}
                  onClick={() => handlePlay(stream)}
                  className={`group relative flex flex-col items-center gap-2 p-3 rounded-xl transition-all card-hover ${
                    stream.stream_id === lastChannelId
                      ? 'bg-accent/10 border border-accent/30'
                      : 'glass hover:bg-surface-light'
                  }`}
                >
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-lighter flex items-center justify-center shrink-0">
                    {stream.stream_icon ? (
                      <img
                        src={stream.stream_icon}
                        alt=""
                        className="w-full h-full object-contain"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <ChannelLogo name={stream.name} size="md" />
                    )}
                  </div>
                  <p className="text-[10px] text-text-primary text-center truncate w-full font-medium">
                    {stream.name}
                  </p>
                  {stream.stream_id === lastChannelId && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full animate-pulse" />
                  )}
                  {favorites.includes(stream.stream_id) && (
                    <Star className="absolute top-1.5 left-1.5 w-3 h-3 text-yellow-400 fill-yellow-400" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
