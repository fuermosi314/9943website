'use client';
import { useToolHistory } from '@/lib/useToolHistory';

import { useState, useCallback } from 'react';
import BackButton from '@/components/BackButton';
import FullscreenButton from '@/components/FullscreenButton';

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
  browserFallback?: boolean;
  warning?: string;
}

const PLATFORM_NAMES: Record<string, string> = {
  douyin: '抖音',
  bilibili: 'B站',
  xigua: '西瓜视频',
  kuaishou: '快手',
  tiktok: 'TikTok',
  unknown: '未知平台',
};

export default function VideoUnwatermarkPage() {
  useToolHistory('video-unwatermark');
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
        body: JSON.stringify({ url: url.trim(), forceBrowser }),
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
  }, [url, forceBrowser]);

  const handleCopyUrl = useCallback(() => {
    if (result?.videoUrl) {
      navigator.clipboard.writeText(result.videoUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [result]);

  const handleDownloadImage = useCallback(async (imgUrl: string, index: number) => {
    try {
      const resp = await fetch(imgUrl);
      const blob = await resp.blob();
      if (blob.type === 'image/gif' || imgUrl.includes('.gif')) {
        window.open(imgUrl, '_blank');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${result?.title?.slice(0, 30) || 'image'}_${index + 1}.webp`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(imgUrl, '_blank');
    }
  }, [result]);

  const handleDownloadVideo = useCallback(async () => {
    if (!result?.videoUrl) return;
    // 用 a 标签 + no-referrer: 浏览器不发 Referer，TikTok CDN 放行
    // download 属性触发另存为，不受 CORS 限制
    const a = document.createElement('a');
    a.href = result.videoUrl;
    a.download = `${result?.title?.slice(0, 30) || 'video'}.mp4`;
    a.referrerPolicy = 'no-referrer';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [result]);

  const handleOpenTikTok = useCallback(() => {
    // 用原始用户输入的链接跳转到 TikTok 页面，方便 AIX 插件或手动查看
    if (url) {
      window.open(url, '_blank');
    }
  }, [url]);

  const [pasteError, setPasteError] = useState(false);
  const [forceBrowser, setForceBrowser] = useState(false);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        return;
      }
    } catch {
      // clipboard API failed, try fallback
    }
    const ta = document.createElement('textarea');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '50%';
    document.body.appendChild(ta);
    ta.focus();
    try {
      document.execCommand('paste');
      const text = ta.value;
      if (text) {
        setUrl(text);
        document.body.removeChild(ta);
        return;
      }
    } catch {
      // execCommand failed
    }
    document.body.removeChild(ta);
    setPasteError(true);
    setTimeout(() => setPasteError(false), 3000);
  }, []);

  return (
    <div className="min-h-screen relative z-10">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl safe-area-top border-b border-white/10">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center">
          <BackButton category="life" />
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="9943" className="w-8 h-8 rounded-lg shadow-lg shadow-orange-500/30" />
            <h1 className="text-lg font-semibold text-white">视频去水印</h1>
          </div>
          <FullscreenButton className="ml-auto" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-24 pb-16">
        {/* 输入区域 */}
        <div className="glass-card p-6 mb-6 animate-fade-in">
          <h2 className="text-base font-semibold text-white mb-1">粘贴视频链接</h2>
          <p className="text-sm text-white/40 mb-4">支持抖音、TikTok、B站、西瓜视频等平台的分享链接</p>

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

          {/* 浏览器直连模式开关 */}
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              role="switch"
              aria-checked={forceBrowser}
              onClick={() => setForceBrowser(!forceBrowser)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                forceBrowser ? 'bg-[#fb6400]' : 'bg-white/10'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  forceBrowser ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-xs text-white/40">
              浏览器直连模式
            </span>
            {forceBrowser && (
              <span className="text-xs text-yellow-400/60">（跳过服务端 API，直接从 TikTok 页面解析）</span>
            )}
          </div>

          {/* 粘贴失败提示 */}
          {pasteError && (
            <div className="mt-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-xs animate-fade-in">
              无法自动粘贴，请长按输入框手动粘贴链接
            </div>
          )}
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

                {/* 浏览器直连模式的警告 */}
                {result.browserFallback && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-yellow-400 text-lg">⚠️</span>
                      <span className="text-yellow-400 text-sm font-semibold">
                        {result.warning || '服务端 API 额度已用完'}
                      </span>
                    </div>
                    <p className="text-yellow-400/60 text-xs ml-6">
                      已改用页面直连模式，请确认代理已开启，然后点击下方按钮下载
                    </p>
                  </div>
                )}

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
                      <button
                        key={i}
                        onClick={() => handleDownloadImage(imgUrl, i)}
                        className="flex-1 py-3 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white font-medium rounded-xl text-center shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all"
                      >
                        🖼️ 下载图片 {result.imageUrls!.length > 1 ? `${i + 1}` : ''}
                      </button>
                    ))
                  ) : result.browserFallback ? (
                    <>
                      <button
                        onClick={handleDownloadVideo}
                        className="flex-1 py-3 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white font-medium rounded-xl text-center shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all active:scale-[0.98]"
                      >
                        🔄 浏览器直连下载
                      </button>
                      <button
                        onClick={handleOpenTikTok}
                        className="px-4 py-3 bg-white/5 border border-white/10 text-white/60 hover:text-[#fb6400] hover:border-[#fb6400]/30 rounded-xl transition-all"
                      >
                        📺 TikTok
                      </button>
                      <button
                        onClick={handleCopyUrl}
                        className="px-4 py-3 bg-white/5 border border-white/10 text-white/60 hover:text-[#fb6400] hover:border-[#fb6400]/30 rounded-xl transition-all"
                      >
                        {copied ? '✓' : '📋'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleDownloadVideo}
                        className="flex-1 py-3 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white font-medium rounded-xl text-center shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all active:scale-[0.98]"
                      >
                        🎬 下载无水印视频
                      </button>
                      <button
                        onClick={handleCopyUrl}
                        className="px-4 py-3 bg-white/5 border border-white/10 text-white/60 hover:text-[#fb6400] hover:border-[#fb6400]/30 rounded-xl transition-all"
                      >
                        {copied ? '✓' : '📋'}
                      </button>
                    </>
                  )}
                </div>

                {/* 底部提示 */}
                {result.type === 'images' ? (
                  <p className="text-xs text-white/30 mt-3 text-center">
                    图文作品由平台提供静态图片，下载为 WebP 格式
                  </p>
                ) : result.browserFallback ? (
                  <p className="text-xs text-white/30 mt-3 text-center">
                    浏览器直连模式：从 TikTok 页面提取链接后直接下载，请确保代理已开启
                  </p>
                ) : (
                  <p className="text-xs text-white/30 mt-3 text-center">
                    下载通过浏览器获取，文件较大时请耐心等待
                  </p>
                )}
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

                {/* 提示信息 */}
                <div className="mt-4 bg-white/5 rounded-xl p-4">
                  <p className="text-sm text-white/60 mb-3">
                    {result.platform === 'kuaishou'
                      ? '该平台暂不支持自动解析，请使用第三方工具。'
                      : '服务端解析失败，可以尝试第三方工具。'}
                  </p>
                  {result.fallbackUrl && (
                    <a
                      href={result.fallbackUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-2 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white text-sm font-medium rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all"
                    >
                      前往第三方工具
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 使用说明 */}
        <div className="glass-card p-6 mt-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <h3 className="text-white font-semibold mb-3">💡 使用说明</h3>
          <ul className="space-y-2 text-white/50 text-sm">
            <li>• 打开抖音/TikTok/B站等APP，点击分享按钮，复制视频链接</li>
            <li>• 粘贴链接到上方输入框，点击解析</li>
            <li>• 解析成功后点击下载按钮保存无水印视频</li>
            <li>• 目前支持：抖音、TikTok、B站、西瓜视频（服务端解析）</li>
            <li>• TikTok API 额度用完时自动切换浏览器直连模式，请确保代理已开启</li>
            <li>• 快手会自动推荐第三方工具</li>
            <li>• 请尊重原创作者版权，仅供个人学习参考使用</li>
          </ul>
        </div>

        {/* 会员视频提示 */}
        <div className="glass-card p-6 mt-4 animate-slide-up border border-[#fb6400]/20" style={{ animationDelay: '200ms' }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#fb6400]/20 flex items-center justify-center shrink-0">
              <span className="text-lg">🎬</span>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">会员视频无法解析？</h3>
              <p className="text-white/50 text-sm mb-3">
                大会员、VIP 等付费视频受版权保护，无法通过链接解析获取。如需观看，请前往网站工具中使用「爱看机器人」进行搜索观看。
              </p>
              <a
                href="/tools/site/aikanbot"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#fb6400] bg-[#fb6400]/10 rounded-lg hover:bg-[#fb6400]/20 transition-colors"
              >
                前往爱看机器人
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
