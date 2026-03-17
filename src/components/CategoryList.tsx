import { useRef, useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';
import type { Category } from '../types/xtream';
import { useIsTV } from '../hooks/useIsTV';
import ChannelLogo from './ChannelLogo';

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
    <div className={`shrink-0 bg-surface rounded-xl flex flex-col ${
      isTV
        ? 'w-full md:w-72 p-4 max-h-[calc(100vh-100px)] md:max-h-[calc(100vh-32px)]'
        : 'w-full md:w-64 p-3 max-h-[calc(100vh-100px)] md:max-h-[calc(100vh-32px)]'
    }`}>
      <div className="relative mb-3">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary ${
          isTV ? 'w-5 h-5' : 'w-4 h-4'
        }`} />
        <input
          type="text"
          placeholder={searchPlaceholder ?? 'Rechercher...'}
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className={`w-full bg-surface-light border border-surface-lighter rounded-lg pr-3 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent transition ${
            isTV ? 'pl-10 py-3 text-base' : 'pl-9 py-2 text-sm'
          }`}
        />
      </div>
      <div className={`overflow-y-auto flex-1 ${isTV ? 'space-y-1' : 'space-y-0.5'}`}>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 text-accent animate-spin" />
          </div>
        ) : (
          <>
            {categories.map((cat) => (
              <CategoryButton
                key={cat.category_id}
                cat={cat}
                isSelected={selected === cat.category_id}
                onSelect={onSelect}
                isTV={isTV}
              />
            ))}
          </>
        )}
      </div>
    </div>
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
      onClick={() => onSelect(cat.category_id)}
      className={`w-full text-left rounded-lg transition flex items-center ${
        isTV
          ? 'text-base px-4 py-3 gap-3 focus:bg-accent/15 focus:text-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-accent'
          : 'text-sm px-3 py-2 gap-2.5'
      } ${
        isSelected
          ? 'bg-accent/15 text-accent font-medium'
          : 'text-text-secondary hover:bg-surface-light hover:text-text-primary'
      }`}
    >
      <ChannelLogo name={cat.category_name} size="sm" />
      <span className="truncate">{cat.category_name}</span>
    </button>
  );
}
