'use client';

import { useState, useCallback } from 'react';
import BackButton from '@/components/BackButton';

interface ParseResult {
  success: boolean;
  platform: string;
  type?: 'video' | 'images';
  title?: string;
  videoUrl?: string;
  imageUrls?: string[];
  coverUrl?: string;
  author?: string;
  error?: string;
  fallbackUrl?: string;
  supportedPlatforms?: string[];
}

const PLATFORM_NAMES: Record<string, string> = {
  douyin: '抖音',
  bilibili: 'B站',
  xigua: '西瓜视频',
  kuaishou: '快手',
  tiktok: 'TikTok',
  unknown: '未知平台',
};

const FALLBACK_SITES = [
  {
    name: '去水印助手',
    url: 'https://www.qushuiyin.cc/',
    desc: '支持抖音、快手、B站等国内平台',
    icon: '🎬',
  },
  {
    name: 'Douyin TikTok 下载',
    url: 'https://douyin.wtf/',
    desc: '抖音/TikTok 视频无水印下载 API',
    icon: '📱',
  },
  {
    name: 'SnapVID',
    url: 'https://snapvid.ai/',
    desc: '支持多平台短视频去水印',
    icon: '⚡',
  },
];

export default function VideoUnwatermarkPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleParse = useCallback(async () => {
    if (!url.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/video-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({
        success: false,
        platform: 'unknown',
        error: '网络请求失败，请重试',
      });
    } finally {
      setLoading(false);
    }
  }, [url]);

  const handleCopyUrl = useCallback(() => {
    if (result?.videoUrl) {
      navigator.clipboard.writeText(result.videoUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [result]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
    } catch {
      // clipboard read failed silently
    }
  }, []);

  return (
    <div className="min-h-screen relative z-10">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center">
          <BackButton toolId="video-unwatermark" />
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="9943" className="w-8 h-8 rounded-lg shadow-lg shadow-orange-500/30" />
            <h1 className="text-lg font-semibold text-white">视频去水印</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-24 pb-16">
        {/* 输入区域 */}
        <div className="glass-card p-6 mb-6 animate-fade-in">
          <h2 className="text-base font-semibold text-white mb-1">粘贴视频链接</h2>
          <p className="text-sm text-white/40 mb-4">支持抖音、B站、西瓜视频等平台的分享链接</p>

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleParse()}
                placeholder="粘贴视频链接..."
                className="w-full px-4 py-3 pr-20 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#fb6400] transition-all"
              />
              <button
                onClick={handlePaste}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs text-white/40 hover:text-[#fb6400] bg-white/5 rounded-lg transition-colors"
              >
                粘贴
              </button>
            </div>
            <button
              onClick={handleParse}
              disabled={loading || !url.trim()}
              className="px-6 py-3 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white font-medium rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  解析中
                </span>
              ) : (
                '解析'
              )}
            </button>
          </div>

          {/* 支持的平台标签 */}
          <div className="flex flex-wrap gap-2 mt-3">
            {Object.entries(PLATFORM_NAMES)
              .filter(([k]) => k !== 'unknown')
              .map(([key, name]) => (
                <span
                  key={key}
                  className="px-2 py-1 text-xs text-white/30 bg-white/5 rounded-lg"
                >
                  {name}
                </span>
              ))}
          </div>
        </div>

        {/* 解析结果 */}
        {result && (
          <div className="glass-card p-6 animate-slide-up">
            {result.success ? (
              <div>
                {/* 成功状态 */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">解析成功</h3>
                    <p className="text-sm text-white/40">
                      {PLATFORM_NAMES[result.platform] || result.platform}
                      {result.author && ` · ${result.author}`}
                    </p>
                  </div>
                </div>

                {/* 视频标题 */}
                {result.title && (
                  <div className="bg-white/5 rounded-xl p-4 mb-4">
                    <p className="text-sm text-white/60">
                      {result.type === 'images' ? '图文标题' : '视频标题'}
                    </p>
                    <p className="text-white mt-1">{result.title}</p>
                  </div>
                )}

                {/* 图文作品：显示所有图片 */}
                {result.type === 'images' && result.imageUrls && result.imageUrls.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {result.imageUrls.map((imgUrl, i) => (
                      <div key={i} className="rounded-xl overflow-hidden">
                        <img
                          src={imgUrl}
                          alt={`图片 ${i + 1}`}
                          className="w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* 视频作品：显示封面 */}
                {result.type !== 'images' && result.coverUrl && (
                  <div className="mb-4 rounded-xl overflow-hidden">
                    <img
                      src={result.coverUrl}
                      alt="视频封面"
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* 下载按钮 */}
                <div className="flex gap-2">
                  {result.type === 'images' && result.imageUrls ? (
                    result.imageUrls.map((imgUrl, i) => (
                      <a
                        key={i}
                        href={imgUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-3 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white font-medium rounded-xl text-center shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all"
                      >
                        🖼️ 下载图片 {result.imageUrls!.length > 1 ? `${i + 1}` : ''}
                      </a>
                    ))
                  ) : (
                    <>
                      <a
                        href={result.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-3 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white font-medium rounded-xl text-center shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all"
                      >
                        🎬 下载无水印视频
                      </a>
                      <button
                        onClick={handleCopyUrl}
                        className="px-4 py-3 bg-white/5 border border-white/10 text-white/60 hover:text-[#fb6400] hover:border-[#fb6400]/30 rounded-xl transition-all"
                      >
                        {copied ? '✓' : '📋'}
                      </button>
                    </>
                  )}
                </div>

                <p className="text-xs text-white/30 mt-3 text-center">
                  点击下载后，长按视频保存到相册，或右键另存为
                </p>
              </div>
            ) : (
              <div>
                {/* 失败状态 */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">
                      {result.error || '解析失败'}
                    </h3>
                    <p className="text-sm text-white/40">
                      {PLATFORM_NAMES[result.platform] || '未知平台'}
                    </p>
                  </div>
                </div>

                {/* 推荐第三方工具 */}
                <div className="mt-4">
                  <p className="text-sm text-white/50 mb-3">试试以下第三方工具：</p>
                  <div className="space-y-2">
                    {FALLBACK_SITES.map((site) => (
                      <a
                        key={site.name}
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 hover:border-[#fb6400]/20 border border-transparent transition-all group"
                      >
                        <span className="text-xl">{site.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium">{site.name}</p>
                          <p className="text-xs text-white/30">{site.desc}</p>
                        </div>
                        <svg
                          className="w-4 h-4 text-white/20 group-hover:text-[#fb6400] transition-colors shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 使用说明 */}
        <div className="glass-card p-6 mt-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <h3 className="text-white font-semibold mb-3">💡 使用说明</h3>
          <ul className="space-y-2 text-white/50 text-sm">
            <li>• 打开抖音/B站等APP，点击分享按钮，复制视频链接</li>
            <li>• 粘贴链接到上方输入框，点击解析</li>
            <li>• 解析成功后点击下载按钮保存无水印视频</li>
            <li>• 目前支持：抖音、B站、西瓜视频（服务端解析）</li>
            <li>• 快手、TikTok 会自动推荐第三方工具</li>
            <li>• 请尊重原创作者版权，仅供个人学习参考使用</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
