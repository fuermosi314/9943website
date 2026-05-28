'use client';

import { useEffect, useRef } from 'react';
import { categories } from '@/lib/tools';

interface CategoryNavProps {
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export default function CategoryNav({ activeCategory, onCategoryChange }: CategoryNavProps) {
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeCategory]);

  return (
    <nav className="sticky top-14 z-40 bg-black/30 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center space-x-2 overflow-x-auto py-3 scrollbar-hide">
          {categories.map((category, index) => (
            <button
              key={category.id}
              ref={activeCategory === category.id ? activeRef : undefined}
              onClick={() => onCategoryChange(category.id)}
              className={`flex items-center px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                activeCategory === category.id
                  ? 'bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white shadow-lg shadow-orange-500/30'
                  : 'text-white/60 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/20'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span className="mr-1.5">{category.icon}</span>
              {category.name}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
