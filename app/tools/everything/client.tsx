'use client';
import { useToolHistory } from '@/lib/useToolHistory';

import BackButton from '@/components/BackButton';
import FullscreenButton from '@/components/FullscreenButton';

const downloads = [
  {
    name: 'x64 安装版',
    icon: '🖥️',
    url: 'https://www.voidtools.com/Everything-1.4.1.1032.x64-Setup.exe',
    desc: '64 位系统 · 完整功能 · 推荐',
    color: 'from-orange-500 to-orange-600',
  },
  {
    name: 'x86 安装版',
    icon: '💻',
    url: 'https://www.voidtools.com/Everything-1.4.1.1032.x86-Setup.exe',
    desc: '32 位系统',
    color: 'from-blue-500 to-blue-600',
  },
  {
    name: 'x64 便携版',
    icon: '📦',
    url: 'https://www.voidtools.com/Everything-1.4.1.1032.x64.Lite-Setup.exe',
    desc: '64 位 · 精简版，体积更小',
    color: 'from-green-500 to-green-600',
  },
  {
    name: 'x86 便携版',
    icon: '📦',
    url: 'https://www.voidtools.com/Everything-1.4.1.1032.x86.Lite-Setup.exe',
    desc: '32 位 · 精简版',
    color: 'from-purple-500 to-purple-600',
  },
];

export default function EverythingPage() {
  useToolHistory('everything');
  return (
    <div className="min-h-screen relative z-10">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl safe-area-top border-b border-white/10">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center">
          <BackButton category="website" />
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#fb6400] rounded-lg flex items-center justify-center shadow-lg">
              <img src="/everything.png" alt="Everything" className="w-5 h-5 object-contain" />
            </div>
            <h1 className="text-lg font-semibold text-white">Everything 下载</h1>
          </div>
          <FullscreenButton className="ml-auto" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 pt-24 pb-16">
        <div className="text-center mb-8">
          <img src="/everything.png" alt="Everything" className="w-20 h-20 mx-auto mb-4 object-contain" />
          <h2 className="text-2xl font-bold text-white mb-2">Everything 下载</h2>
          <p className="text-white/40 text-sm">Windows 文件秒搜神器，瞬间定位任意文件</p>
        </div>

        <div className="space-y-4">
          {downloads.map((d) => (
            <a
              key={d.name}
              href={d.url}
              download
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
                下载
              </div>
            </a>
          ))}
        </div>

        <div className="mt-8 glass-card p-5">
          <h3 className="text-white font-semibold mb-3">💡 为什么推荐 Everything？</h3>
          <ul className="space-y-2 text-white/50 text-sm">
            <li>• <span className="text-white/70">秒级搜索</span>：基于 NTFS 索引，百万文件瞬间出结果</li>
            <li>• <span className="text-white/70">极低资源</span>：内存占用仅 ~50MB，后台常驻无感知</li>
            <li>• <span className="text-white/70">完全免费</span>：个人/商业使用均免费，无广告无捆绑</li>
            <li>• <span className="text-white/70">实时更新</span>：文件变动即时同步索引，无需手动刷新</li>
            <li>• <span className="text-white/70">正则支持</span>：支持正则表达式、通配符等高级搜索</li>
          </ul>
        </div>

        <div className="mt-4 glass-card p-5">
          <h3 className="text-white font-semibold mb-3">📋 安装提示</h3>
          <ul className="space-y-2 text-white/50 text-sm">
            <li>• 安装版：双击运行，按提示完成安装</li>
            <li>• 便携版（Lite）：精简版本，适合 U 盘携带</li>
            <li>• 建议选择 <span className="text-[#fb6400]">x64 安装版</span>（主流 64 位系统）</li>
            <li>• 安装后会自动建立索引，首次可能需要几分钟</li>
          </ul>
        </div>

        <div className="mt-4 text-center">
          <a
            href="https://www.voidtools.com/zh-cn/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/30 hover:text-[#fb6400] transition-colors"
          >
            官网：www.voidtools.com
          </a>
        </div>
      </main>
    </div>
  );
}
