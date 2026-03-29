import { useRef, useCallback } from 'react';
import { Search, Loader2, Layers } from 'lucide-react';
import type { Category } from '../types/xtream';
import { useIsTV } from '../hooks/useIsTV';
import ChannelLogo from './ChannelLogo';
import DragonBallAura from './DragonBallAura';
import { playNav } from '../services/sounds';

/** Convert category_id string to a stable number for DragonBallAura */
function catIdToNum(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface Props {
  categories: Category[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  search: string;
  onSearch: (v: string) => void;
  searchPlaceholder?: string;
  loading?: boolean;
}

export default function CategoryList({ categories, selected, onSelect, search, onSearch, searchPlaceholder, loading }: Props) {
  const isTV = useIsTV();

  return (
    <>
      {/* MOBILE: horizontal scrollable categories */}
      <div className="md:hidden flex flex-col gap-2">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/50 w-4 h-4" />
          <input
            type="text"
            placeholder={searchPlaceholder ?? 'Rechercher...'}
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full bg-surface-light/50 border border-surface-lighter/50 rounded-xl pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-accent/50 transition"
          />
        </div>
        {/* Horizontal category chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {loading ? (
            <Loader2 className="w-5 h-5 text-accent animate-spin mx-auto" />
          ) : (
            categories.map((cat) => (
              <button
                key={cat.category_id}
                onClick={() => { playNav(); onSelect(cat.category_id); }}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap group ${
                  selected === cat.category_id
                    ? 'bg-accent text-black shadow-sm shadow-accent/20'
                    : 'bg-surface-light/50 text-text-secondary hover:text-text-primary'
                }`}
              >
                <div className="relative w-7 h-7 shrink-0">
                  <DragonBallAura streamId={catIdToNum(cat.category_id)} size="xs" />
                  <div className="relative z-[1]">
                    <ChannelLogo name={cat.category_name} size="xs" />
                  </div>
                </div>
                {cat.category_name}
              </button>
            ))
          )}
        </div>
      </div>

      {/* DESKTOP: vertical sidebar */}
      <div className={`hidden md:flex shrink-0 glass rounded-xl flex-col ${
        isTV
          ? 'w-72 p-4 max-h-[calc(100vh-32px)]'
          : 'w-64 p-3 max-h-[calc(100vh-32px)]'
      }`}>
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-accent" />
          <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">Categories</span>
          <span className="ml-auto text-[10px] text-text-secondary bg-surface-lighter px-2 py-0.5 rounded-full">
            {categories.length}
          </span>
        </div>
        <div className="relative mb-3">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/50 ${
            isTV ? 'w-5 h-5' : 'w-4 h-4'
          }`} />
          <input
            type="text"
            placeholder={searchPlaceholder ?? 'Rechercher...'}
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className={`w-full bg-surface-light/50 border border-surface-lighter/50 rounded-xl pr-3 text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-accent/50 focus:bg-surface-light transition ${
              isTV ? 'pl-10 py-3 text-base' : 'pl-9 py-2.5 text-sm'
            }`}
          />
        </div>
        <div className={`overflow-y-auto flex-1 ${isTV ? 'space-y-1' : 'space-y-0.5'}`}>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 text-accent animate-spin" />
            </div>
          ) : (
            categories.map((cat) => (
              <CategoryButton
                key={cat.category_id}
                cat={cat}
                isSelected={selected === cat.category_id}
                onSelect={onSelect}
                isTV={isTV}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}

function CategoryButton({ cat, isSelected, onSelect, isTV }: {
  cat: Category;
  isSelected: boolean;
  onSelect: (id: string) => void;
  isTV: boolean;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleFocus = useCallback(() => {
    if (isTV && btnRef.current) {
      btnRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isTV]);

  return (
    <button
      ref={btnRef}
      onFocus={handleFocus}
      onClick={() => { playNav(); onSelect(cat.category_id); }}
      className={`w-full text-left rounded-xl transition-all flex items-center group ${
        isTV
          ? 'text-base px-4 py-3 gap-3'
          : 'text-sm px-3 py-2.5 gap-2.5'
      } ${
        isSelected
          ? 'bg-gradient-to-r from-accent/20 to-accent/5 text-accent font-medium border-l-3 border-accent shadow-sm shadow-accent/10'
          : 'text-text-secondary hover:bg-surface-light/50 hover:text-text-primary'
      }`}
    >
      <div className={`relative shrink-0 ${isTV ? 'w-8 h-8' : 'w-7 h-7'}`}>
        <DragonBallAura streamId={catIdToNum(cat.category_id)} size="xs" />
        <div className="relative z-[1]">
          <ChannelLogo name={cat.category_name} size="xs" />
        </div>
      </div>
      <span className="truncate flex-1">{cat.category_name}</span>
      {isSelected && <span className="w-1.5 h-1.5 bg-accent rounded-full shrink-0" />}
    </button>
  );
}
