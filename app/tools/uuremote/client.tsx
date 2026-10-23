'use client';
import { useToolHistory } from '@/lib/useToolHistory';

import BackButton from '@/components/BackButton';
import FullscreenButton from '@/components/FullscreenButton';

const platforms = [
  {
    name: 'Windows',
    icon: '🪟',
    url: 'https://api.nrd.nie.163.com/api/v1/release/dl/1?channel=gwqd',
    desc: '适用于 Windows 10/11',
    color: 'from-blue-500 to-blue-600',
  },
  {
    name: 'macOS',
    icon: '🍎',
    url: 'https://api.nrd.nie.163.com/api/v1/release/dl/4?channel=gwqd',
    desc: '适用于 macOS 11.0+ · .pkg',
    color: 'from-gray-500 to-gray-600',
  },
  {
    name: 'Android',
    icon: '🤖',
    url: 'https://api.nrd.nie.163.com/api/v1/release/dl/2?channel=gwqd',
    desc: 'Android 手机/平板 · .apk',
    color: 'from-green-500 to-green-600',
  },
  {
    name: 'iOS',
    icon: '📱',
    url: 'https://apps.apple.com/cn/app/uu%E8%BF%9C%E7%A8%8B/id1642306791',
    desc: '前往 App Store 下载',
    color: 'from-sky-500 to-sky-600',
    external: true,
  },
  {
    name: 'Android TV',
    icon: '📺',
    url: 'https://api.nrd.nie.163.com/api/v1/release/dl/5?channel=TV_gwqd',
    desc: '电视/盒子 · .apk',
    color: 'from-purple-500 to-purple-600',
  },
];

export default function UURemotePage() {
  useToolHistory('uuremote');
  return (
    <div className="min-h-screen relative z-10">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl safe-area-top border-b border-white/10">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center">
          <BackButton category="website" />
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#1b2838] rounded-lg flex items-center justify-center shadow-lg">
              <img src="/uuyc.jpg" alt="网易UU远程" className="w-5 h-5 object-contain rounded" />
            </div>
            <h1 className="text-lg font-semibold text-white">网易UU远程 下载</h1>
          </div>
          <FullscreenButton className="ml-auto" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 pt-24 pb-16">
        <div className="text-center mb-8">
          <img src="/uuyc.jpg" alt="网易UU远程" className="w-20 h-20 mx-auto mb-4 object-contain rounded-2xl" />
          <h2 className="text-2xl font-bold text-white mb-2">网易UU远程 客户端下载</h2>
          <p className="text-white/40 text-sm">免费远程控制软件，真 4K、真免费</p>
        </div>

        <div className="space-y-4">
          {platforms.map((p) => (
            <a
              key={p.name}
              href={p.url}
              target={p.external ? '_blank' : undefined}
              rel={p.external ? 'noopener noreferrer' : undefined}
              download={!p.external}
              className="glass-card p-5 flex items-center gap-4 group hover:border-[#fb6400]/30 transition-all"
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center text-2xl shrink-0`}>
                {p.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-lg">{p.name}</h3>
                <p className="text-white/40 text-sm">{p.desc}</p>
              </div>
              <div className="shrink-0 px-4 py-2 bg-[#fb6400] rounded-lg text-white text-sm font-medium group-hover:bg-[#ff8c00] transition-colors">
                {p.external ? '前往' : '下载'}
              </div>
            </a>
          ))}
        </div>

        <div className="mt-8 glass-card p-5">
          <h3 className="text-white font-semibold mb-3">核心功能</h3>
          <ul className="space-y-2 text-white/50 text-sm">
            <li>• <span className="text-white/70">远程控制</span>：电脑、手机、平板、电视互相远程，支持 Windows / Mac 被控</li>
            <li>• <span className="text-white/70">高清画面</span>：真 4K 画质，远程办公、远程游戏都清晰流畅</li>
            <li>• <span className="text-white/70">文件传输</span>：两端之间直接传文件，不用再借助网盘</li>
            <li>• <span className="text-white/70">远程开机</span>：支持网络唤醒，电脑关机也能远程拉起</li>
            <li>• <span className="text-white/70">无线副屏</span>：把平板或手机变成电脑的扩展屏幕</li>
          </ul>
        </div>

        <div className="mt-4 glass-card p-5">
          <h3 className="text-white font-semibold mb-3">💡 安装提示</h3>
          <ul className="space-y-2 text-white/50 text-sm">
            <li>• Windows：双击 .exe 安装包，按提示完成安装</li>
            <li>• macOS：打开 .pkg 按提示安装；首次运行若被拦截，到「系统设置 → 隐私与安全性」允许</li>
            <li>• Android：下载 .apk 后直接安装，需在系统中允许安装未知来源应用</li>
            <li>• iOS：跳转 App Store 获取，搜索「UU远程」也可找到</li>
            <li>• 远程控制需要被控端也安装并运行客户端，按页面提示完成连接</li>
          </ul>
        </div>

        <div className="mt-4 text-center">
          <a
            href="https://uuyc.163.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/30 hover:text-[#fb6400] transition-colors"
          >
            官网：uuyc.163.com
          </a>
        </div>
      </main>
    </div>
  );
}
