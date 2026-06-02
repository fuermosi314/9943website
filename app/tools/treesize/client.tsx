'use client';
import { useToolHistory } from '@/lib/useToolHistory';

import BackButton from '@/components/BackButton';
import FullscreenButton from '@/components/FullscreenButton';

const downloads = [
  {
    name: '安装版',
    icon: '💿',
    url: 'https://downloads.jam-software.de/treesize_free/TreeSizeFreeSetup_x86.exe',
    desc: 'Windows · exe 安装程序',
    color: 'from-blue-500 to-blue-600',
  },
  {
    name: '便携版',
    icon: '📦',
    url: 'https://downloads.jam-software.de/treesize_free/TreeSizeFree-Portable.zip?language=EN',
    desc: 'Windows · zip 解压即用',
    color: 'from-cyan-500 to-cyan-600',
  },
  {
    name: 'TreeSize Professional',
    icon: '⭐',
    url: 'https://www.jam-software.com/treesize',
    desc: '付费版，更多功能（官网）',
    color: 'from-yellow-500 to-yellow-600',
    external: true,
  },
];

export default function TreesizePage() {
  useToolHistory('treesize');
  return (
    <div className="min-h-screen relative z-10">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl safe-area-top border-b border-white/10">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center">
          <BackButton category="website" />
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-lg">🌳</span>
            </div>
            <h1 className="text-lg font-semibold text-white">TreeSize 下载</h1>
          </div>
          <FullscreenButton className="ml-auto" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 pt-24 pb-16">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-4xl">🌳</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">TreeSize Free</h2>
          <p className="text-white/40 text-sm">专业磁盘空间分析工具，快速找出大文件</p>
        </div>

        <div className="space-y-4">
          {downloads.map((d) => (
            <a
              key={d.name}
              href={d.url}
              target={d.external ? '_blank' : undefined}
              rel={d.external ? 'noopener noreferrer' : undefined}
              download={!d.external}
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
                {d.external ? '前往' : '下载'}
              </div>
            </a>
          ))}
        </div>

        <div className="mt-8 glass-card p-5">
          <h3 className="text-white font-semibold mb-3">核心功能</h3>
          <ul className="space-y-2 text-white/50 text-sm">
            <li>• <span className="text-white/70">磁盘分析</span>：可视化展示磁盘空间占用，快速定位大文件</li>
            <li>• <span className="text-white/70">文件搜索</span>：按大小、日期、类型筛选文件</li>
            <li>• <span className="text-white/70">重复文件</span>：查找并清理重复文件，释放空间</li>
            <li>• <span className="text-white/70">清理建议</span>：智能识别可清理的文件和文件夹</li>
          </ul>
        </div>

        <div className="mt-4 glass-card p-5">
          <h3 className="text-white font-semibold mb-3">安装提示</h3>
          <ul className="space-y-2 text-white/50 text-sm">
            <li>• 安装版：双击 .exe 运行，按提示安装</li>
            <li>• 便携版：下载 .zip 解压，运行 TreeSizeFree.exe</li>
            <li>• Free 版免费使用，满足日常磁盘管理需求</li>
          </ul>
        </div>

        <div className="mt-4 text-center">
          <a
            href="https://www.jam-software.com/treesize"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/30 hover:text-[#fb6400] transition-colors"
          >
            官网：jam-software.com/treesize
          </a>
        </div>
      </main>
    </div>
  );
}
