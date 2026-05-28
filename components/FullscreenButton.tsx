'use client';

import { useState, useEffect } from 'react';

interface FullscreenButtonProps {
  className?: string;
  showHint?: boolean;
}

export default function FullscreenButton({ className = '', showHint = false }: FullscreenButtonProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTip, setShowTip] = useState(showHint);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  useEffect(() => {
    if (showTip) {
      const timer = setTimeout(() => setShowTip(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showTip]);

  const toggle = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        onClick={toggle}
        className="flex items-center justify-center w-10 h-10 text-white/60 hover:text-[#fb6400] transition-colors"
        title={isFullscreen ? '退出全屏' : '全屏'}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isFullscreen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9h4.5M15 9V4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15h4.5M15 15v4.5m0-4.5l5.5 5.5" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          )}
        </svg>
      </button>
      {showTip && (
        <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap text-xs text-white/60 bg-black/80 px-2 py-1 rounded pointer-events-none animate-pulse">
          建议全屏体验
        </span>
      )}
    </div>
  );
}
