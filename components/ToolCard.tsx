'use client';

import Link from 'next/link';
import { Tool } from '@/lib/tools';
import { toggleToolFavorite } from '@/lib/storage';

interface ToolCardProps {
  tool: Tool;
  index?: number;
  animated?: boolean;
  isFavorite?: boolean;
  onFavoriteChange?: (toolId: string, isFavorite: boolean) => void;
  fromCategory?: string;
}

export default function ToolCard({
  tool,
  index = 0,
  animated = true,
  isFavorite = false,
  onFavoriteChange,
  fromCategory
}: ToolCardProps) {
  const isExternal = tool.path.startsWith('http');

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newFavorites = toggleToolFavorite(tool.id);
    const nowFavorite = newFavorites.includes(tool.id);
    onFavoriteChange?.(tool.id, nowFavorite);
  };

  const getToolUrl = () => {
    const baseUrl = tool.path;
    if (fromCategory && (fromCategory === 'favorites' || fromCategory === 'history')) {
      const separator = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${separator}from=${fromCategory}`;
    }
    return baseUrl;
  };

  const toolUrl = getToolUrl();

  const card = (
    <div
      className={`group relative glass-card p-4 sm:p-6 cursor-pointer transition-all duration-300 hover:transform hover:scale-105 h-full${animated ? ' animate-fade-in' : ''}`}
      style={animated ? { animationDelay: `${index * 80}ms` } : undefined}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#fb6400]/10 to-[#ff8c00]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* 收藏按钮 */}
      <button
        onClick={handleFavoriteClick}
        className="absolute top-1 right-1 z-10 w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110"
        title={isFavorite ? '取消收藏' : '收藏'}
      >
        <svg
          className={`w-4 h-4 transition-colors duration-200 ${isFavorite ? 'text-[#fb6400] fill-[#fb6400]' : 'text-white/30 hover:text-white/60'}`}
          fill={isFavorite ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </button>

      <div className="relative flex flex-col items-center h-full">
        <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 sm:mb-4 bg-gradient-to-br from-white/10 to-white/5 rounded-xl flex items-center justify-center text-2xl sm:text-3xl group-hover:scale-110 transition-transform duration-300 border border-white/10 group-hover:border-[#fb6400]/30 flex-shrink-0">
          {tool.icon.startsWith('/') ? (
            <img src={tool.icon} alt={tool.name} className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
          ) : (
            tool.icon
          )}
        </div>

        <h3 className="text-xs sm:text-sm font-semibold text-white text-center mb-1 line-clamp-2 flex-shrink-0">
          {tool.name}
        </h3>

        <p className="text-xs text-white/50 text-center leading-relaxed line-clamp-2 mt-auto">
          {tool.description}
        </p>
      </div>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] group-hover:w-16 transition-all duration-300 rounded-full" />
    </div>
  );

  if (isExternal) {
    return (
      <a href={toolUrl} target="_blank" rel="noopener noreferrer">
        {card}
      </a>
    );
  }

  return <Link href={toolUrl}>{card}</Link>;
}
