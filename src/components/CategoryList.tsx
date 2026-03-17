import { Search, Loader2 } from 'lucide-react';
import type { Category } from '../types/xtream';
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
  return (
    <div className="w-full md:w-64 shrink-0 bg-surface rounded-xl p-3 flex flex-col max-h-[calc(100vh-100px)] md:max-h-[calc(100vh-32px)]">
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        <input
          type="text"
          placeholder={searchPlaceholder ?? 'Rechercher...'}
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full bg-surface-light border border-surface-lighter rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent transition"
        />
      </div>
      <div className="overflow-y-auto flex-1 space-y-0.5">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 text-accent animate-spin" />
          </div>
        ) : (
          <>
            {categories.map((cat) => (
              <button
                key={cat.category_id}
                onClick={() => onSelect(cat.category_id)}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg transition flex items-center gap-2.5 ${
                  selected === cat.category_id
                    ? 'bg-accent/15 text-accent font-medium'
                    : 'text-text-secondary hover:bg-surface-light hover:text-text-primary'
                }`}
              >
                <ChannelLogo name={cat.category_name} size="sm" />
                <span className="truncate">{cat.category_name}</span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
