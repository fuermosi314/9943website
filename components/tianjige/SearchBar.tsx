'use client';

import { SearchResult } from './useTianjigeState';

interface SearchBarProps {
  searchQuery: string;
  searchResults: SearchResult[];
  onSearch: (q: string) => void;
  onSelect: (result: SearchResult) => void;
}

export default function SearchBar({ searchQuery, searchResults, onSearch, onSelect }: SearchBarProps) {
  const hasQuery = searchQuery.trim().length > 0;

  return (
    <div className="max-w-xs w-48 sm:w-64">
      <div className="relative">
        <input type="text" placeholder="🔍 搜索物品..."
          value={searchQuery} onChange={e => onSearch(e.target.value)}
          className="w-full bg-black/50 backdrop-blur text-white px-3 py-2 pr-8 rounded-lg border border-white/20 text-sm placeholder-white/40 focus:border-[#fb6400] outline-none" />
        {hasQuery && (
          <button onClick={() => onSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-sm transition-colors">
            &times;
          </button>
        )}
      </div>

      {hasQuery && searchResults.length === 0 && (
        <div className="mt-1 bg-[#1a1a2e] border border-white/10 rounded-xl p-4 text-center">
          <p className="text-white/30 text-sm">未找到匹配的物品</p>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="mt-1 bg-[#1a1a2e] border border-white/10 rounded-xl max-h-[min(240px,50vh)] overflow-y-auto">
          {searchResults.map((r, i) => (
            <button key={i} onClick={() => onSelect(r)}
              className="w-full px-4 py-3 text-left hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-white text-sm">{r.item.name}</span>
                <div className="flex items-center gap-2">
                  {r.item.category && <span className="text-white/30 text-xs">{r.item.category}</span>}
                  <span className="text-[#fb6400] text-xs">×{r.item.quantity}</span>
                  {r.item.price > 0 && <span className="text-white/40 text-xs">¥{r.item.price}</span>}
                </div>
              </div>
              <div className="text-white/30 text-xs mt-0.5">{r.scene.emoji} {r.scene.name} › {r.furniture.name}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
