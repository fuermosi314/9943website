'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import CategoryNav from '@/components/CategoryNav';
import ToolCard from '@/components/ToolCard';
import { tools, getToolsByCategory, searchTools } from '@/lib/tools';
import { getToolFavorites, setToolFavorites, getToolHistory } from '@/lib/storage';

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
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [historyIds, setHistoryIds] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingRef = useRef(false);

  // 刷新收藏和历史数据
  const refreshData = useCallback(() => {
    setFavoriteIds(getToolFavorites());
    setHistoryIds(getToolHistory().map((r) => r.toolId));
  }, []);

  // 初始加载和页面可见性变化时刷新数据
  useEffect(() => {
    refreshData();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', refreshData);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', refreshData);
    };
  }, [refreshData]);

  // 收藏状态变化时的回调
  const handleFavoriteChange = useCallback((toolId: string, isFavorite: boolean) => {
    setFavoriteIds(prev => {
      if (isFavorite) {
        return prev.includes(toolId) ? prev : [...prev, toolId];
      } else {
        return prev.filter(id => id !== toolId);
      }
    });
  }, []);

  // 长按拖拽排序 - 仅在收藏分类下生效
  const handleDragStart = useCallback((toolId: string) => {
    if (activeCategory !== 'favorites') return;
    isDraggingRef.current = true;
    setDraggingId(toolId);
  }, [activeCategory]);

  const handleDragOver = useCallback((toolId: string) => {
    if (!isDraggingRef.current || !draggingId || toolId === draggingId) return;
    setDragOverId(toolId);
  }, [draggingId]);

  const handleDragEnd = useCallback(() => {
    if (!isDraggingRef.current || !draggingId || !dragOverId || draggingId === dragOverId) {
      setDraggingId(null);
      setDragOverId(null);
      isDraggingRef.current = false;
      return;
    }

    setFavoriteIds(prev => {
      const newIds = [...prev];
      const dragIndex = newIds.indexOf(draggingId);
      const overIndex = newIds.indexOf(dragOverId);
      if (dragIndex === -1 || overIndex === -1) return prev;
      newIds.splice(dragIndex, 1);
      newIds.splice(overIndex, 0, draggingId);
      setToolFavorites(newIds);
      return newIds;
    });

    setDraggingId(null);
    setDragOverId(null);
    isDraggingRef.current = false;
  }, [draggingId, dragOverId]);

  // 触摸事件处理
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const touchedId = useRef<string | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent, toolId: string) => {
    if (activeCategory !== 'favorites') return;
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    touchedId.current = toolId;

    longPressTimerRef.current = setTimeout(() => {
      handleDragStart(toolId);
      // 触发振动反馈
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  }, [activeCategory, handleDragStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);

    // 移动超过 10px 取消长按
    if (dx > 10 || dy > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }

    // 如果正在拖拽，找到当前触摸位置下的元素
    if (isDraggingRef.current) {
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const card = element?.closest('[data-tool-id]');
      if (card) {
        const targetId = card.getAttribute('data-tool-id');
        if (targetId) handleDragOver(targetId);
      }
    }
  }, [handleDragOver]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPos.current = null;
    touchedId.current = null;
    handleDragEnd();
  }, [handleDragEnd]);

  // 鼠标事件处理（桌面端）
  const handleMouseDown = useCallback((e: React.MouseEvent, toolId: string) => {
    if (activeCategory !== 'favorites' || e.button !== 0) return;
    longPressTimerRef.current = setTimeout(() => {
      handleDragStart(toolId);
    }, 500);
  }, [activeCategory, handleDragStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const element = document.elementFromPoint(e.clientX, e.clientY);
    const card = element?.closest('[data-tool-id]');
    if (card) {
      const targetId = card.getAttribute('data-tool-id');
      if (targetId) handleDragOver(targetId);
    }
  }, [handleDragOver]);

  const handleMouseUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    handleDragEnd();
  }, [handleDragEnd]);

  const animatedCatsRef = useRef<Set<string> | null>(null);
  if (!animatedCatsRef.current) {
    if (typeof window !== 'undefined') {
      try {
        const raw = sessionStorage.getItem('tools-animated-categories');
        animatedCatsRef.current = new Set<string>(raw ? JSON.parse(raw) : []);
      } catch {
        animatedCatsRef.current = new Set<string>();
      }
    } else {
      animatedCatsRef.current = new Set<string>();
    }
  }
  const animatedCats = animatedCatsRef.current;
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const cat = searchParams.get('category') || 'all';
    setActiveCategory(cat);
    // 切换分类时刷新数据
    refreshData();
    if (!animatedCats.has(cat)) {
      animatedCats.add(cat);
      sessionStorage.setItem('tools-animated-categories', JSON.stringify(Array.from(animatedCats)));
      setAnimated(true);
    } else {
      setAnimated(false);
    }
  }, [searchParams, animatedCats, refreshData]);

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

  const getDisplayTools = () => {
    if (searchQuery) return searchTools(searchQuery);
    if (activeCategory === 'favorites') {
      // 按收藏顺序显示，而不是按 tools 数组顺序
      return favoriteIds
        .map(id => tools.find(tool => tool.id === id))
        .filter(Boolean) as typeof tools;
    }
    if (activeCategory === 'history') {
      // 按最新使用时间排序
      const history = getToolHistory();
      const sortedTools = history
        .map(record => tools.find(tool => tool.id === record.toolId))
        .filter(Boolean) as typeof tools;
      return sortedTools;
    }
    return getToolsByCategory(activeCategory);
  };

  const displayTools = getDisplayTools();

  const getEmptyMessage = () => {
    if (activeCategory === 'favorites') return '还没有收藏任何工具';
    if (activeCategory === 'history') return '还没有使用过任何工具';
    return '没有找到匹配的工具';
  };

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
        <div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {displayTools.map((tool, index) => (
            <div
              key={tool.id}
              data-tool-id={tool.id}
              onTouchStart={(e) => handleTouchStart(e, tool.id)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={(e) => handleMouseDown(e, tool.id)}
              className={`transition-transform duration-200 ${
                draggingId === tool.id ? 'opacity-50 scale-95' : ''
              } ${dragOverId === tool.id ? 'scale-105' : ''}`}
            >
              <ToolCard
                tool={tool}
                index={index}
                animated={animated}
                isFavorite={favoriteIds.includes(tool.id)}
                onFavoriteChange={handleFavoriteChange}
                fromCategory={activeCategory}
              />
            </div>
          ))}
        </div>

        {displayTools.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
              <svg className="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-white/30 text-sm">{getEmptyMessage()}</p>
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
