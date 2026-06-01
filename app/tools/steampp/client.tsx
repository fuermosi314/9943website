'use client';
import { useToolHistory } from '@/lib/useToolHistory';

import BackButton from '@/components/BackButton';
import FullscreenButton from '@/components/FullscreenButton';

const downloads = [
  {
    name: 'Windows x64',
    icon: '🪟',
    url: 'https://gitee.com/rmbgame/SteamTools/releases/download/3.1.0/Steam%20%20_v3.1.0_win_x64.exe',
    desc: 'Windows 64 位 · 安装版 · 推荐',
    color: 'from-blue-500 to-blue-600',
  },
  {
    name: 'Windows x64 便携版',
    icon: '📦',
    url: 'https://gitee.com/rmbgame/SteamTools/releases/download/3.1.0/Steam++_v3.1.0_win_x64.7z',
    desc: 'Windows 64 位 · 7z 压缩包，解压即用',
    color: 'from-cyan-500 to-cyan-600',
  },
  {
    name: 'macOS',
    icon: '🍎',
    url: 'https://steampp.net',
    desc: '前往官网下载 macOS 版本',
    color: 'from-gray-500 to-gray-600',
  },
  {
    name: 'Linux',
    icon: '🐧',
    url: 'https://steampp.net',
    desc: '前往官网下载 Linux 版本',
    color: 'from-yellow-600 to-yellow-700',
  },
];

export default function SteamppPage() {
  useToolHistory('steampp');
  return (
    <div className="min-h-screen relative z-10">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl safe-area-top border-b border-white/10">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center">
          <BackButton category="website" />
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#1b2838] rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-lg">🔧</span>
            </div>
            <h1 className="text-lg font-semibold text-white">Watt Toolkit 下载</h1>
          </div>
          <FullscreenButton className="ml-auto" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 pt-24 pb-16">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-[#1b2838] to-[#2a475e] rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-4xl">🔧</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Watt Toolkit</h2>
          <p className="text-white/40 text-sm">原 Steam++ · Steam 加速/令牌/多账号管理工具</p>
        </div>

        <div className="space-y-4">
          {downloads.map((d) => (
            <a
              key={d.name}
              href={d.url}
              target={d.url.startsWith('http') && !d.url.includes('gitee.com/releases') ? '_blank' : undefined}
              rel={d.url.startsWith('http') && !d.url.includes('gitee.com/releases') ? 'noopener noreferrer' : undefined}
              download={d.url.includes('gitee.com')}
              className="glass-card p-5 flex items-center gap-4 group hover:border-[#fb6400]/30 transition-all"
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${d.color} flex items-center justify-center text-2xl shrink-0`}>
                {d.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-lg">{d.name}</h3>
                <p className="text-white/40 text-sm">{d.desc}</p>
              </div>
              <div className="shrink-0 px-4 py-2 bg-[#fb6400] rounded-lg text-white text-sm font-medium group-hover:bg-[#ff8c00] transition-colors">
                {d.url.includes('gitee.com') ? '下载' : '前往'}
              </div>
            </a>
          ))}
        </div>

        <div className="mt-8 glass-card p-5">
          <h3 className="text-white font-semibold mb-3">核心功能</h3>
          <ul className="space-y-2 text-white/50 text-sm">
            <li>• <span className="text-white/70">网络加速</span>：Steam 商店/社区/CDN 加速，解决国内访问慢</li>
            <li>• <span className="text-white/70">本地令牌</span>：多账号令牌管理，一键切换</li>
            <li>• <span className="text-white/70">库存管理</span>：游戏库存浏览，本地存档备份</li>
            <li>• <span className="text-white/70">账号切换</span>：多平台账号一键切换（Steam/Epic/EA 等）</li>
            <li>• <span className="text-white/70">挂卡功能</span>：Steam 挂卡，自动掉卡</li>
          </ul>
        </div>

        <div className="mt-4 glass-card p-5">
          <h3 className="text-white font-semibold mb-3">安装提示</h3>
          <ul className="space-y-2 text-white/50 text-sm">
            <li>• Windows 安装版：双击 .exe 运行，按提示安装</li>
            <li>• Windows 便携版：下载 .7z 解压，运行 Steam++.exe</li>
            <li>• macOS/Linux：前往官网选择对应版本下载</li>
            <li>• 安装后首次启动需登录 Watt 账号</li>
          </ul>
        </div>

        <div className="mt-4 text-center space-x-4">
          <a
            href="https://steampp.net"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/30 hover:text-[#fb6400] transition-colors"
          >
            官网：steampp.net
          </a>
          <a
            href="https://gitee.com/rmbgame/SteamTools"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/30 hover:text-[#fb6400] transition-colors"
          >
            Gitee 源码
          </a>
        </div>
      </main>
    </div>
  );
}
