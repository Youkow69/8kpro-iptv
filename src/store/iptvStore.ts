import { create } from 'zustand';
import type { Category, LiveStream, VodStream, Series } from '../types/xtream';

interface IptvState {
  // Live
  liveCategories: Category[];
  liveStreams: LiveStream[];
  selectedLiveCategory: string | null;
  setLiveCategories: (cats: Category[]) => void;
  setLiveStreams: (streams: LiveStream[]) => void;
  setSelectedLiveCategory: (id: string | null) => void;

  // VOD
  vodCategories: Category[];
  vodStreams: VodStream[];
  selectedVodCategory: string | null;
  setVodCategories: (cats: Category[]) => void;
  setVodStreams: (streams: VodStream[]) => void;
  setSelectedVodCategory: (id: string | null) => void;

  // Series
  seriesCategories: Category[];
  seriesList: Series[];
  selectedSeriesCategory: string | null;
  setSeriesCategories: (cats: Category[]) => void;
  setSeriesList: (list: Series[]) => void;
  setSelectedSeriesCategory: (id: string | null) => void;

  // Player
  playerUrl: string | null;
  playerTitle: string | null;
  playerStreamId: number | null;
  playerMode: 'live' | 'vod' | 'series' | null;
  openPlayer: (url: string, title: string, streamId?: number, mode?: 'live' | 'vod' | 'series') => void;
  closePlayer: () => void;

  // Favorites
  favorites: number[];
  toggleFavorite: (id: number) => void;
  isFavorite: (id: number) => boolean;

  // Last channel
  lastChannelId: number | null;
  setLastChannel: (id: number) => void;

  // Search history
  searchHistory: string[];
  addSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;
}

function loadFavorites(): number[] {
  try {
    const raw = localStorage.getItem('iptv_favorites');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export const useIptvStore = create<IptvState>((set, get) => ({
  liveCategories: [],
  liveStreams: [],
  selectedLiveCategory: localStorage.getItem('iptv_last_live_cat') || null,
  setLiveCategories: (liveCategories) => set({ liveCategories }),
  setLiveStreams: (liveStreams) => set({ liveStreams }),
  setSelectedLiveCategory: (id) => {
    if (id) localStorage.setItem('iptv_last_live_cat', id);
    else localStorage.removeItem('iptv_last_live_cat');
    set({ selectedLiveCategory: id });
  },

  vodCategories: [],
  vodStreams: [],
  selectedVodCategory: localStorage.getItem('iptv_last_vod_cat') || null,
  setVodCategories: (vodCategories) => set({ vodCategories }),
  setVodStreams: (vodStreams) => set({ vodStreams }),
  setSelectedVodCategory: (id) => {
    if (id) localStorage.setItem('iptv_last_vod_cat', id);
    else localStorage.removeItem('iptv_last_vod_cat');
    set({ selectedVodCategory: id });
  },

  seriesCategories: [],
  seriesList: [],
  selectedSeriesCategory: localStorage.getItem('iptv_last_series_cat') || null,
  setSeriesCategories: (seriesCategories) => set({ seriesCategories }),
  setSeriesList: (seriesList) => set({ seriesList }),
  setSelectedSeriesCategory: (id) => {
    if (id) localStorage.setItem('iptv_last_series_cat', id);
    else localStorage.removeItem('iptv_last_series_cat');
    set({ selectedSeriesCategory: id });
  },

  playerUrl: null,
  playerTitle: null,
  playerStreamId: null,
  playerMode: null,
  openPlayer: (playerUrl, playerTitle, playerStreamId, playerMode) =>
    set({ playerUrl, playerTitle, playerStreamId: playerStreamId ?? null, playerMode: playerMode ?? null }),
  closePlayer: () => set({ playerUrl: null, playerTitle: null, playerStreamId: null, playerMode: null }),

  favorites: loadFavorites(),
  toggleFavorite: (id) => {
    const { favorites } = get();
    const next = favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id];
    localStorage.setItem('iptv_favorites', JSON.stringify(next));
    set({ favorites: next });
  },
  isFavorite: (id) => get().favorites.includes(id),

  lastChannelId: (() => {
    const saved = localStorage.getItem('iptv_last_channel');
    return saved ? Number(saved) : null;
  })(),
  setLastChannel: (id) => {
    localStorage.setItem('iptv_last_channel', String(id));
    set({ lastChannelId: id });
  },

  // Search history
  searchHistory: (() => {
    try { return JSON.parse(localStorage.getItem('iptv_search_history') || '[]') as string[]; }
    catch { return []; }
  })(),
  addSearchHistory: (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;
    const history = [trimmed, ...get().searchHistory.filter((h) => h !== trimmed)].slice(0, 15);
    localStorage.setItem('iptv_search_history', JSON.stringify(history));
    set({ searchHistory: history });
  },
  clearSearchHistory: () => {
    localStorage.removeItem('iptv_search_history');
    set({ searchHistory: [] });
  },
}));
