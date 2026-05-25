'use client';

import { useState, useCallback } from 'react';
import BackButton from '@/components/BackButton';

interface DownloadManager {
  name: string;
  icon: string;
  desc: string;
  url: string;
  features: string[];
  color: string;
}

const managers: DownloadManager[] = [
  {
    name: 'IDM',
    icon: '⚡',
    desc: 'Internet Download Manager，老牌下载加速神器',
    url: 'https://www.internetdownloadmanager.com/',
    features: ['多线程下载', '自动抓取链接', '断点续传', '浏览器集成'],
    color: 'from-blue-500 to-blue-600',
  },
  {
    name: 'aria2',
    icon: '🚀',
    desc: '开源命令行下载工具，支持多种协议',
    url: 'https://aria2.github.io/',
    features: ['多连接下载', 'HTTP/FTP/BitTorrent', 'JSON-RPC 接口', '跨平台'],
    color: 'from-green-500 to-green-600',
  },
  {
    name: 'Motrix',
    icon: '🎯',
    desc: '开源全能下载工具，界面美观易用',
    url: 'https://motrix.app/',
    features: ['aria2 内核', 'BT/磁力下载', '简洁界面', '跨平台'],
    color: 'from-purple-500 to-purple-600',
  },
  {
    name: 'NDM',
    icon: '📡',
    desc: 'Neat Download Manager，免费的 IDM 替代品',
    url: 'https://www.neatdownloadmanager.com/',
    features: ['多线程加速', '浏览器扩展', '免费使用', '支持 macOS'],
    color: 'from-orange-500 to-orange-600',
  },
];

const tips = [
  {
    icon: '🔌',
    title: '使用多线程下载工具',
    desc: 'IDM、aria2 等工具可以将文件分成多个片段同时下载，大幅提升速度。',
  },
  {
    icon: '🔗',
    title: '选择就近的下载源',
    desc: '优先选择国内镜像源或 CDN 节点，减少网络延迟。',
  },
  {
    icon: '⏰',
    title: '避开网络高峰期',
    desc: '晚间 8-11 点是网络高峰期，凌晨或上午下载速度更快。',
  },
  {
    icon: '📶',
    title: '使用有线网络',
    desc: '有线连接比 WiFi 更稳定，速度波动更小。',
  },
];

export default function FastDownloadPage() {
  const [url, setUrl] = useState('');
  const [analysis, setAnalysis] = useState<{
    fileName: string;
    fileType: string;
    suggestion: string;
  } | null>(null);

  const handleAnalyze = useCallback(() => {
    if (!url.trim()) return;

    try {
      const parsed = new URL(url.trim());
      const pathParts = parsed.pathname.split('/');
      const lastPart = pathParts[pathParts.length - 1] || '未知文件';
      const fileName = decodeURIComponent(lastPart);
      const ext = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() || '' : '';

      let fileType = '未知类型';
      let suggestion = '建议使用 IDM 或 Motrix 进行多线程下载加速。';

      if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
        fileType = '压缩包';
        suggestion = '压缩包文件通常较大，强烈建议使用多线程下载工具加速。';
      } else if (['exe', 'msi', 'dmg', 'deb', 'rpm', 'appimage'].includes(ext)) {
        fileType = '安装包';
        suggestion = '安装包文件建议使用下载工具的断点续传功能，避免下载中断。';
      } else if (['mp4', 'mkv', 'avi', 'mov', 'flv', 'wmv'].includes(ext)) {
        fileType = '视频文件';
        suggestion = '视频文件通常很大，建议使用 IDM 或 aria2 多线程下载。';
      } else if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) {
        fileType = '音频文件';
      } else if (['iso', 'img'].includes(ext)) {
        fileType = '镜像文件';
        suggestion = '镜像文件通常非常大，强烈建议使用支持断点续传的下载工具。';
      } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
        fileType = '文档文件';
      } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
        fileType = '图片文件';
      } else if (ext) {
        fileType = `.${ext} 文件`;
      }

      setAnalysis({ fileName, fileType, suggestion });
    } catch {
      setAnalysis({
        fileName: '无效链接',
        fileType: '无法识别',
        suggestion: '请输入有效的下载链接（以 http:// 或 https:// 开头）。',
      });
    }
  }, [url]);

  return (
    <div className="min-h-screen relative z-10">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center">
          <BackButton toolId="fast-download" />
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="9943" className="w-8 h-8 rounded-lg shadow-lg shadow-orange-500/30" />
            <h1 className="text-lg font-semibold text-white">高速下载</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-24 pb-16">
        <div className="text-center mb-8 animate-fade-in">
          <div className="text-4xl mb-3">⚡</div>
          <h2 className="text-2xl font-bold text-white mb-2">高速下载助手</h2>
          <p className="text-white/40 text-sm">分析下载链接，推荐最佳下载方案</p>
        </div>

        {/* 链接分析 */}
        <div className="glass-card p-6 mb-6 animate-fade-in">
          <h3 className="text-base font-semibold text-white mb-1">粘贴下载链接</h3>
          <p className="text-sm text-white/40 mb-4">分析文件类型，推荐下载加速方案</p>

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                placeholder="粘贴下载链接..."
                className="w-full px-4 py-3 pr-20 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#fb6400] transition-all"
              />
              <button
                onClick={() => {
                  navigator.clipboard.readText().then((text) => setUrl(text)).catch(() => {});
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs text-white/40 hover:text-[#fb6400] bg-white/5 rounded-lg transition-colors"
              >
                粘贴
              </button>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={!url.trim()}
              className="px-6 py-3 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white font-medium rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              分析
            </button>
          </div>

          {/* 分析结果 */}
          {analysis && (
            <div className="mt-4 bg-white/5 rounded-xl p-4 animate-slide-up">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">📄</span>
                <span className="text-white font-medium">{analysis.fileName}</span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-white/40">类型：</span>
                <span className="text-sm text-[#fb6400]">{analysis.fileType}</span>
              </div>
              <div className="bg-[#fb6400]/10 border border-[#fb6400]/20 rounded-lg p-3">
                <p className="text-sm text-white/70">💡 {analysis.suggestion}</p>
              </div>
              <a
                href={url.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block w-full py-3 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white font-medium rounded-xl text-center shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all"
              >
                开始下载
              </a>
            </div>
          )}
        </div>

        {/* 下载工具推荐 */}
        <div className="mb-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <span className="text-xl">🛠️</span> 推荐下载工具
          </h3>
          <div className="space-y-3">
            {managers.map((mgr) => (
              <a
                key={mgr.name}
                href={mgr.url}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-card p-5 block hover:border-[#fb6400]/30 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${mgr.color} flex items-center justify-center text-white text-lg shrink-0`}>
                    {mgr.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-medium">{mgr.name}</h4>
                      <svg
                        className="w-4 h-4 text-white/20 group-hover:text-[#fb6400] transition-colors"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                    <p className="text-xs text-white/40 mb-2">{mgr.desc}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {mgr.features.map((f) => (
                        <span key={f} className="px-2 py-0.5 text-xs text-white/30 bg-white/5 rounded-md">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* 加速技巧 */}
        <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <span className="text-xl">💡</span> 下载加速技巧
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tips.map((tip) => (
              <div key={tip.title} className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{tip.icon}</span>
                  <h4 className="text-white text-sm font-medium">{tip.title}</h4>
                </div>
                <p className="text-xs text-white/40">{tip.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
