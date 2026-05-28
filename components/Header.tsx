'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import FullscreenButton from './FullscreenButton';

interface HeaderProps {
  onSearch: (query: string) => void;
}

export default function Header({ onSearch }: HeaderProps) {
  const [query, setQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleSearch = () => {
    if (searchOpen) {
      setQuery('');
      onSearch('');
      setSearchOpen(false);
    } else {
      setSearchOpen(true);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

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
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/feedback"
          className={`flex items-center space-x-2 group shrink-0 transition-all duration-300 ${
            searchOpen ? 'sm:flex' : ''
          }`}
        >
          <div className="relative">
            <img
              src="/logo.png"
              alt="9943"
              className="w-10 h-10 rounded-lg transform group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-orange-500/30"
            />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#ff4444] rounded-full animate-pulse" />
          </div>
          <div className={`${searchOpen ? 'hidden sm:block' : 'block'}`}>
            <span className="text-xl font-bold text-[#fb6400] tracking-wide" style={{ textShadow: '0 0 20px rgba(251, 100, 0, 0.5)' }}>
              9943小工具大全
            </span>
            <div className="text-[10px] text-orange-300/60 tracking-widest">TOOLS COLLECTION</div>
          </div>
        </Link>

        {/* 搜索框 - 桌面端始终展开 */}
        <form onSubmit={handleSearch} className="hidden sm:flex flex-1 max-w-sm ml-12">
          <div className="relative group w-full">
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

        {/* 搜索框 - 手机端可展开 */}
        <div className={`flex sm:hidden items-center ${searchOpen ? 'flex-1 ml-2' : ''}`}>
          {searchOpen ? (
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    onSearch(e.target.value);
                  }}
                  placeholder="搜索工具..."
                  className="w-full px-4 py-2 pr-10 bg-white/10 border border-white/20 rounded-full text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#fb6400] transition-all duration-300"
                />
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); toggleSearch(); }}
                  onClick={(e) => { e.preventDefault(); toggleSearch(); }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#fb6400] rounded-full flex items-center justify-center"
                >
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={toggleSearch}
              className="w-9 h-9 bg-[#fb6400] rounded-full flex items-center justify-center hover:bg-[#ff8c00] transition-colors"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          )}
        </div>

        {/* 右侧 */}
        <div className={`flex items-center space-x-3 ${searchOpen ? 'hidden sm:flex' : ''}`}>
          <FullscreenButton showHint />
          <div className="hidden md:flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-white/40">在线</span>
          </div>
        </div>
      </div>
    </header>
  );
}
