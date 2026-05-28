'use client';
import { useToolHistory } from '@/lib/useToolHistory';

import dynamic from 'next/dynamic';
import BackButton from '@/components/BackButton';
import FullscreenButton from '@/components/FullscreenButton';

const Scene3D = dynamic(() => import('@/components/tianjige/Scene3D'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-white/50 text-lg">加载 3D 场景中...</div>
    </div>
  ),
});

export default function TianjigePage() {
  useToolHistory('tianjige');
  return (
    <div className="min-h-screen relative z-10">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a1a]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center">
          <BackButton toolId="tianjige" />
          <h1 className="text-lg font-bold text-[#fb6400]">天机阁</h1>
          <div className="flex-1" />
          <FullscreenButton />
        </div>
      </div>

      {/* 3D Scene */}
      <div className="pt-14">
        <Scene3D />
      </div>
    </div>
  );
}
