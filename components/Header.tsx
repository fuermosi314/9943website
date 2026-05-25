'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface HeaderProps {
  onSearch: (query: string) => void;
}

export default function Header({ onSearch }: HeaderProps) {
  const [query, setQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#1a0a00]/90 backdrop-blur-md shadow-lg shadow-orange-500/10'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link
          href="/feedback"
          className="flex items-center space-x-3 group"
        >
          {/* Logo - 9943 像素风图标 */}
          <div className="relative">
            <img
              src="/logo.png"
              alt="9943"
              className="w-10 h-10 rounded-lg transform group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-orange-500/30"
            />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#ff4444] rounded-full animate-pulse" />
          </div>
          <div>
            <span className="text-xl font-bold text-[#fb6400] tracking-wide" style={{ textShadow: '0 0 20px rgba(251, 100, 0, 0.5)' }}>
              9943小工具大全
            </span>
            <div className="text-[10px] text-orange-300/60 tracking-widest">TOOLS COLLECTION</div>
          </div>
        </Link>

        <form onSubmit={handleSearch} className="flex-1 max-w-sm ml-12">
          <div className="relative group">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                onSearch(e.target.value);
              }}
              placeholder="搜索工具..."
              className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-full text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#fb6400] focus:bg-white/15 transition-all duration-300"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#fb6400] rounded-full flex items-center justify-center hover:bg-[#ff8c00] transition-colors"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </form>

        {/* 右侧装饰 */}
        <div className="hidden md:flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-white/40">在线</span>
        </div>
      </div>
    </header>
  );
}
