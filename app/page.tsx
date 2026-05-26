'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import CategoryNav from '@/components/CategoryNav';
import ToolCard from '@/components/ToolCard';
import { tools, getToolsByCategory, searchTools } from '@/lib/tools';

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a1a]" />}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [animated, setAnimated] = useState(() => {
    if (typeof window === 'undefined') return true;
    const played = sessionStorage.getItem('tools-animation-played');
    if (played) return false;
    sessionStorage.setItem('tools-animation-played', '1');
    return true;
  });

  useEffect(() => {
    setActiveCategory(searchParams.get('category') || 'all');
  }, [searchParams]);

  const handleCategoryChange = useCallback((id: string) => {
    setActiveCategory(id);
    setSearchQuery('');
    const params = new URLSearchParams(searchParams);
    if (id === 'all') {
      params.delete('category');
    } else {
      params.set('category', id);
    }
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : '/', { scroll: false });
  }, [searchParams, router]);

  const displayTools = searchQuery
    ? searchTools(searchQuery)
    : getToolsByCategory(activeCategory);

  return (
    <div className="min-h-screen relative z-10">
      <Header onSearch={setSearchQuery} />
      <CategoryNav
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
      />

      <main className="max-w-6xl mx-auto px-6 pt-28 pb-16">
        {/* Hero Section - 模仿 4399 风格 */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            <span className="text-[#fb6400]" style={{ textShadow: '0 0 30px rgba(251, 100, 0, 0.5)' }}>
              简单好用的
            </span>
            <br />
            <span className="text-white">
              在线工具
            </span>
          </h1>
          <p className="text-white/50 text-lg max-w-md mx-auto">
            为你精心准备的效率工具集，让工作更轻松
          </p>

          {/* 装饰性元素 */}
          <div className="flex justify-center mt-6 space-x-2">
            <div className="w-8 h-1 bg-[#fb6400] rounded-full" />
            <div className="w-4 h-1 bg-[#fb6400]/50 rounded-full" />
            <div className="w-2 h-1 bg-[#fb6400]/30 rounded-full" />
          </div>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {displayTools.map((tool, index) => (
            <ToolCard key={tool.id} tool={tool} index={index} animated={animated} />
          ))}
        </div>

        {displayTools.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
              <svg className="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-white/30 text-sm">没有找到匹配的工具</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 relative z-10">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <img src="/logo.png" alt="9943" className="w-6 h-6 rounded" />
            <span className="text-sm font-semibold text-[#fb6400]">9943小工具大全</span>
          </div>
          <p className="text-xs text-white/30">
            © 2026 9943小工具大全 · 简单好用的在线工具集
          </p>
        </div>
      </footer>
    </div>
  );
}
