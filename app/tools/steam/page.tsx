'use client';

import BackButton from '@/components/BackButton';

const platforms = [
  {
    name: 'Windows',
    icon: '🪟',
    url: 'https://cdn.akamai.steamstatic.com/client/installer/SteamSetup.exe',
    desc: '适用于 Windows 10/11',
    color: 'from-blue-500 to-blue-600',
  },
  {
    name: 'macOS',
    icon: '🍎',
    url: 'https://cdn.akamai.steamstatic.com/client/installer/Steam.dmg',
    desc: '适用于 macOS 10.15+',
    color: 'from-gray-500 to-gray-600',
  },
  {
    name: 'Linux',
    icon: '🐧',
    url: 'https://cdn.akamai.steamstatic.com/client/installer/steam.deb',
    desc: 'Debian/Ubuntu .deb 包',
    color: 'from-yellow-600 to-yellow-700',
  },
];

export default function SteamPage() {
  return (
    <div className="min-h-screen relative z-10">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center">
          <BackButton toolId="steam" />
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#1b2838] rounded-lg flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-white">Steam 下载</h1>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 pt-24 pb-16">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🎮</div>
          <h2 className="text-2xl font-bold text-white mb-2">Steam 客户端下载</h2>
          <p className="text-white/40 text-sm">全球最大游戏平台，畅享海量游戏</p>
        </div>

        <div className="space-y-4">
          {platforms.map((p) => (
            <a
              key={p.name}
              href={p.url}
              download
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
                下载
              </div>
            </a>
          ))}
        </div>

        <div className="mt-8 glass-card p-5">
          <h3 className="text-white font-semibold mb-3">💡 安装提示</h3>
          <ul className="space-y-2 text-white/50 text-sm">
            <li>• 下载后双击运行安装程序，按提示完成安装</li>
            <li>• 首次启动需要注册或登录 Steam 账号</li>
            <li>• 建议安装到 SSD 硬盘以加快游戏加载速度</li>
            <li>• Linux 用户也可通过 <code className="text-[#fb6400]">sudo apt install steam</code> 安装</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
