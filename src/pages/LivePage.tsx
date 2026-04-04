import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useIptvStore } from '../store/iptvStore';
import { getLiveCategories, getLiveStreams, buildLiveStreamUrl } from '../services/xtreamApi';
import CategoryList from '../components/CategoryList';
import ChannelCard from '../components/ChannelCard';
import LoadingSpinner from '../components/LoadingSpinner';
import SkeletonGrid from '../components/SkeletonGrid';
import { Star, LayoutGrid, List, Tv, Search as SearchIcon } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { useIsTV } from '../hooks/useIsTV';
import { playClick } from '../services/sounds';
import ChannelLogo from '../components/ChannelLogo';
import DragonBallAura from '../components/DragonBallAura';
import { useDebounce } from '../hooks/useDebounce';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import ScrollToTop from '../components/ScrollToTop';

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
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    const saved = localStorage.getItem('liveViewMode');
    return saved === 'grid' ? 'grid' : 'list';
  });
  const debouncedSearch = useDebounce(search, 200);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (liveCategories.length === 0) {
      setLoadingCats(true);
      getLiveCategories(credentials)
        .then((cats) => {
          setLiveCategories(cats);
          if (selectedLiveCategory) {
            // Verify saved category still exists
            if (!cats.some((c) => c.category_id === selectedLiveCategory)) {
              setSelectedLiveCategory(cats[0]?.category_id ?? null);
            }
          } else if (cats.length > 0) {
            setSelectedLiveCategory(cats[0].category_id);
          }
        })
        .catch(console.error)
        .finally(() => setLoadingCats(false));
    }
  }, [credentials, liveCategories.length, setLiveCategories, selectedLiveCategory, setSelectedLiveCategory]);

  useEffect(() => {
    if (selectedLiveCategory === null && liveCategories.length === 0) return;
    setLoading(true);
    reset();
    getLiveStreams(credentials, selectedLiveCategory ?? undefined)
      .then(setLiveStreams)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [credentials, selectedLiveCategory, setLiveStreams, liveCategories.length]);

  const filtered = liveStreams
    .filter((s) => s.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
    .filter((s) => !showFavsOnly || favorites.includes(s.stream_id));

  const { visibleCount, reset, sentinelRef, hasMore } = useInfiniteScroll(filtered.length);
  const visible = filtered.slice(0, visibleCount);

  const handlePlay = (stream: typeof liveStreams[0]) => {
    playClick();
    if (search.trim()) addSearchHistory(search.trim());
    setLastChannel(stream.stream_id);
    const url = buildLiveStreamUrl(credentials, stream.stream_id);
    openPlayer(url, stream.name, stream.stream_id, 'live');
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 flex-1 page-enter">
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
        <div className={`flex items-center gap-2 border-b border-white/[0.04] ${isTV ? 'px-5 py-3' : 'px-4 py-2.5'}`}>
          <button
            onClick={() => { playClick(); setShowFavsOnly((s) => !s); }}
            className={`flex items-center gap-1.5 rounded-xl font-medium transition-all border ${
              isTV ? 'px-4 py-2 text-sm' : 'px-3 py-1.5 text-xs'
            } ${
              showFavsOnly
                ? 'bg-amber-400/10 text-amber-400 border-amber-400/15'
                : 'text-text-secondary/60 hover:text-text-primary hover:bg-white/[0.03] border-transparent'
            }`}
          >
            <Star className={`${isTV ? 'w-5 h-5' : 'w-3.5 h-3.5'} ${showFavsOnly ? 'fill-amber-400' : ''}`} />
            {t('live.favorites')}
          </button>

          {/* View mode toggle */}
          <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5 ml-2 border border-white/[0.03]">
            <button
              onClick={() => { setViewMode('list'); localStorage.setItem('liveViewMode', 'list'); }}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-accent text-black shadow-sm' : 'text-text-secondary/50 hover:text-text-primary'}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setViewMode('grid'); localStorage.setItem('liveViewMode', 'grid'); }}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-accent text-black shadow-sm' : 'text-text-secondary/50 hover:text-text-primary'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          <span className={`text-text-secondary/40 ml-auto font-medium ${isTV ? 'text-sm' : 'text-xs'}`}>
            {filtered.length} {t('live.channels')}
          </span>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {loading ? (
            <SkeletonGrid count={12} type="channel" />
          ) : loadingCats ? (
            <LoadingSpinner text={t('live.loading')} />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-text-secondary/50 gap-3">
              {debouncedSearch ? <SearchIcon className="w-10 h-10 text-text-secondary/20" /> : showFavsOnly ? <Star className="w-10 h-10 text-text-secondary/20" /> : <Tv className="w-10 h-10 text-text-secondary/20" />}
              <p>{showFavsOnly ? t('live.noFavorites') : t('live.noChannels')}</p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="divide-y divide-white/[0.03] stagger-list">
              {visible.map((stream, i) => (
                <ChannelCard
                  key={stream.stream_id}
                  stream={stream}
                  onClick={() => handlePlay(stream)}
                  isLast={stream.stream_id === lastChannelId}
                  index={i}
                />
              ))}
              {hasMore && <div ref={sentinelRef} className="h-10" />}
            </div>
          ) : (
            <div className={`grid gap-3 p-4 ${
              isTV ? 'grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
            }`}>
              {visible.map((stream) => (
                <button
                  key={stream.stream_id}
                  onClick={() => handlePlay(stream)}
                  className={`group relative flex flex-col items-center gap-2 p-3 rounded-xl transition-all card-hover border ${
                    stream.stream_id === lastChannelId
                      ? 'bg-accent/[0.06] border-accent/20'
                      : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="relative w-14 h-14">
                    <DragonBallAura streamId={stream.stream_id} size="xs" />
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center shrink-0"
                      style={{ zIndex: 1 }}
                    >
                      <ChannelLogo name={stream.name} size="md" />
                      <div className="channel-logo-shine" />
                    </div>
                  </div>
                  <p className="text-[10px] text-center truncate w-full font-medium channel-name-gradient">
                    {stream.name}
                  </p>
                  {stream.stream_id === lastChannelId && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full animate-pulse" />
                  )}
                  {favorites.includes(stream.stream_id) && (
                    <Star className="absolute top-1.5 left-1.5 w-3 h-3 text-amber-400 fill-amber-400" />
                  )}
                </button>
              ))}
              {hasMore && <div ref={sentinelRef} className="col-span-full h-10" />}
            </div>
          )}
        </div>
        <ScrollToTop scrollRef={scrollRef} />
      </div>
    </div>
  );
}
