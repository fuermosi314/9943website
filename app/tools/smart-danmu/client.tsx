'use client';
import { useToolHistory } from '@/lib/useToolHistory';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import BackButton from '@/components/BackButton';
import FullscreenButton from '@/components/FullscreenButton';

const GITHUB_REPO = 'fuermosi314/apps';
const ASSET_NAME = 'smart-danmu.zip'; // 默认文件名，用于匹配

const features = [
  { icon: '🤖', title: 'AI 智能生成', desc: '视觉AI分析屏幕内容，自动生成弹幕' },
  { icon: '💬', title: '多种人格', desc: '16种弹幕风格，吐槽/文艺/技术/萌系等' },
  { icon: '🎯', title: '智能去重', desc: '自动检测重复弹幕，保持内容新鲜' },
  { icon: '🎤', title: '语音朗读', desc: '支持TTS语音合成，弹幕可以读出来' },
];

export default function SmartDanmuPage() {
  useToolHistory('smart-danmu');
  const router = useRouter();
  const [downloadUrl, setDownloadUrl] = useState('');
  const [version, setVersion] = useState('');

  useEffect(() => {
    fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`)
      .then(res => res.json())
      .then(data => {
        const asset = data.assets?.find((a: any) => a.name.includes('danmu') || a.name.includes('.zip'));
        if (asset) {
          setDownloadUrl(asset.browser_download_url);
          setVersion(data.tag_name);
        }
      })
      .catch(() => {
        // fallback
        setDownloadUrl(`https://github.com/${GITHUB_REPO}/releases/download/v2.0.1/smart-danmu.zip`);
        setVersion('v2.0.1');
      });
  }, []);

  return (
    <div className="min-h-screen relative z-10">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl safe-area-top border-b border-white/10">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center">
          <BackButton category="software" />
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#fb6400] to-[#ff8c00] rounded-lg flex items-center justify-center shadow-lg text-lg">
              💬
            </div>
            <h1 className="text-lg font-semibold text-white">智能弹幕</h1>
          </div>
          <FullscreenButton className="ml-auto" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 pt-24 pb-16">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-[#fb6400] to-[#ff8c00] rounded-2xl flex items-center justify-center text-5xl shadow-lg shadow-[#fb6400]/20">
            💬
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">智能弹幕</h2>
          <p className="text-white/40 text-sm">{version || 'v2.0.1'} · Windows 64位 · 75MB</p>
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
            <li>• 下载解压后，双击运行 exe 文件</li>
            <li>• 首次运行需要配置 AI API Key</li>
            <li>• 支持多种 AI 服务商（豆包/阿里/智谱/MiMo）</li>
            <li>• 可自定义弹幕人格和风格</li>
            <li>• 支持截图生成弹幕和内置弹幕库</li>
            <li>• 仅支持 Windows 系统</li>
          </ul>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 text-center text-white/20 text-xs">
          本软件基于开源项目 DanmuAI，仅供学习交流
        </div>
      </main>
    </div>
  );
}
