'use client';

import { useParams, useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';
import { tools } from '@/lib/tools';
import { siteFeatures } from '@/lib/site-features';
import { useToolHistory } from '@/lib/useToolHistory';

export default function SiteDetailClient() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  useToolHistory(slug);

  const tool = tools.find((t) => t.id === slug);
  const features = tool ? (siteFeatures[tool.id] || []) : [];

  if (!tool) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6">🔍</div>
          <h1 className="text-2xl font-bold text-[#fb6400] mb-4">未找到该工具</h1>
          <p className="text-gray-400 mb-8">抱歉，您访问的工具不存在或已被移除</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] rounded-xl font-semibold hover:scale-105 transition-transform"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10 safe-area-top">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center">
          <BackButton category="website" />
          <div className="ml-auto flex items-center gap-2">
            <img src="/logo.png" alt="9943" className="w-5 h-5 rounded" />
            <span className="text-xs text-[#fb6400] font-semibold">9943小工具大全</span>
          </div>
        </div>
      </nav>

      <main className="pt-28 pb-16 px-4 animate-fade-in">
        <div className="max-w-2xl mx-auto">
          {/* Icon */}
          <div className="text-center mb-8">
            <div className={`inline-block p-8 rounded-3xl mb-6 ${tool.icon.startsWith('/') ? 'border border-white/5' : 'glass-card border border-white/10'}`}>
              {tool.icon.startsWith('/') ? (
                <img src={tool.icon} alt={tool.name} className="w-20 h-20 object-contain" />
              ) : (
                <span className="text-7xl block">{tool.icon}</span>
              )}
            </div>
          </div>

          {/* Name with glow */}
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-6">
            <span
              className="text-[#fb6400]"
              style={{ textShadow: '0 0 20px rgba(251, 100, 0, 0.5), 0 0 40px rgba(251, 100, 0, 0.3)' }}
            >
              {tool.name}
            </span>
          </h1>

          {/* Description */}
          <p className="text-white/50 text-lg text-center mb-12">{tool.description}</p>

          {/* Features list */}
          <div className="glass-card rounded-2xl p-8 mb-12 border border-white/10">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-3">
              <span className="w-1.5 h-5 bg-gradient-to-b from-[#fb6400] to-[#ff8c00] rounded-full" />
              功能特点
            </h2>
            <div className="space-y-3">
              {features.map((feature, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 group"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-gradient-to-r from-[#fb6400]/20 to-[#ff8c00]/20 text-[#fb6400] text-xs font-bold mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-white/70 text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <a
              href={tool.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-12 py-4 text-lg font-bold text-white rounded-2xl bg-gradient-to-r from-[#fb6400] to-[#ff8c00] hover:scale-105 hover:shadow-[0_0_30px_rgba(251,100,0,0.4)] active:scale-95 transition-all duration-300"
            >
              点击前往
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            <p className="text-white/20 text-xs mt-4">将在新标签页中打开外部链接</p>
          </div>

          {/* Decor */}
          <div className="flex justify-center items-center gap-4 mt-16 opacity-30">
            <div className="h-px w-20 bg-gradient-to-r from-transparent to-[#fb6400]" />
            <div className="flex gap-2">
              <div className="w-2 h-2 rounded-full bg-[#fb6400]" />
              <div className="w-2 h-2 rounded-full bg-[#ff8c00]" />
              <div className="w-2 h-2 rounded-full bg-[#fb6400]" />
            </div>
            <div className="h-px w-20 bg-gradient-to-l from-transparent to-[#ff8c00]" />
          </div>

          <div className="text-center mt-8 pb-8">
            <p className="text-white/10 text-xs">9943小工具大全 · 更多工具等你探索</p>
          </div>
        </div>
      </main>

      {/* BG effects */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(251,100,0,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(251,100,0,0.5) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#fb6400]/[0.03] rounded-full blur-[120px] pointer-events-none" />
    </div>
  );
}
