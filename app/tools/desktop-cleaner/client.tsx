'use client';
import { useToolHistory } from '@/lib/useToolHistory';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';
import FullscreenButton from '@/components/FullscreenButton';

const downloadUrl = 'https://github.com/fuermosi314/apps/releases/download/v2.0.0/AI.Setup.2.0.0.exe';

const features = [
  { icon: '🤖', title: 'AI 智能分析', desc: '神经网络驱动的桌面布局优化算法' },
  { icon: '⚡', title: '一键整理', desc: '自动检测并优化桌面图标排列' },
  { icon: '🎯', title: '精准恢复', desc: '关闭程序后图标自动恢复原位' },
  { icon: '🔒', title: '安全无损', desc: '不修改任何系统设置，纯绿色软件' },
];

export default function DesktopCleanerPage() {
  useToolHistory('desktop-cleaner');
  const router = useRouter();

  return (
    <div className="min-h-screen relative z-10">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl safe-area-top border-b border-white/10">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center">
          <BackButton category="software" />
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#fb6400] to-[#ff8c00] rounded-lg flex items-center justify-center shadow-lg text-lg">
              🧹
            </div>
            <h1 className="text-lg font-semibold text-white">AI智能桌面整理大师</h1>
          </div>
          <FullscreenButton className="ml-auto" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 pt-24 pb-16">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-[#fb6400] to-[#ff8c00] rounded-2xl flex items-center justify-center text-5xl shadow-lg shadow-[#fb6400]/20">
            🧹
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">AI智能桌面整理大师</h2>
          <p className="text-white/40 text-sm">v2.0.0 · Windows 64位 · 97MB</p>
        </div>

        {/* Download Button */}
        <button
          onClick={() => router.push(`/tools/fast-download?url=${encodeURIComponent(downloadUrl)}`)}
          className="w-full py-4 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] rounded-xl text-white text-center font-semibold text-lg shadow-lg shadow-[#fb6400]/30 hover:shadow-[#fb6400]/50 transition-all active:scale-95 mb-8"
        >
          ⚡ 高速下载
        </button>

        {/* Features */}
        <div className="glass-card p-5 mb-6">
          <h3 className="text-white font-semibold mb-4">✨ 功能特点</h3>
          <div className="grid grid-cols-2 gap-4">
            {features.map((f) => (
              <div key={f.title} className="text-center">
                <div className="text-2xl mb-1">{f.icon}</div>
                <div className="text-white text-sm font-medium">{f.title}</div>
                <div className="text-white/40 text-xs">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Usage Tips */}
        <div className="glass-card p-5">
          <h3 className="text-white font-semibold mb-3">💡 使用说明</h3>
          <ul className="space-y-2 text-white/50 text-sm">
            <li>• 下载后双击运行安装程序，按提示完成安装</li>
            <li>• 启动后点击"启动AI整理"按钮，图标会自动隐藏到窗口后面</li>
            <li>• 拖动窗口可以改变图标位置，关闭程序后图标自动恢复</li>
            <li>• 支持检测自动排列和网格对齐状态</li>
            <li>• 仅支持 Windows 系统</li>
          </ul>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 text-center text-white/20 text-xs">
          本软件仅供娱乐，请勿用于恶作剧
        </div>
      </main>
    </div>
  );
}
