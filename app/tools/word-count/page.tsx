'use client';
import { useToolHistory } from '@/lib/useToolHistory';

import { useState, useMemo } from 'react';
import BackButton from '@/components/BackButton';
import FullscreenButton from '@/components/FullscreenButton';

export default function WordCount() {
  useToolHistory('word-count');
  const [text, setText] = useState('');

  const stats = useMemo(() => {
    if (!text) {
      return {
        characters: 0,
        charactersNoSpaces: 0,
        words: 0,
        lines: 0,
        paragraphs: 0,
      };
    }

    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, '').length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text ? text.split('\n').length : 0;
    const paragraphs = text.trim() ? text.trim().split(/\n\s*\n/).length : 0;

    return {
      characters,
      charactersNoSpaces,
      words,
      lines,
      paragraphs,
    };
  }, [text]);

  const statItems = [
    { label: '字符数', value: stats.characters, icon: '📝' },
    { label: '不含空格', value: stats.charactersNoSpaces, icon: '🔤' },
    { label: '单词数', value: stats.words, icon: '📖' },
    { label: '行数', value: stats.lines, icon: '📋' },
    { label: '段落数', value: stats.paragraphs, icon: '📄' },
  ];

  return (
    <div className="min-h-screen relative z-10">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center">
          <BackButton toolId="word-count" />
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="9943" className="w-8 h-8 rounded-lg shadow-lg shadow-orange-500/30" />
            <h1 className="text-lg font-semibold text-white">字数统计</h1>
          </div>
        </div>
        <FullscreenButton />
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        <div className="animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stats */}
            <div className="md:col-span-1">
              <div className="glass-card p-6 sticky top-28">
                <h2 className="text-base font-semibold text-white mb-5">统计结果</h2>
                <div className="space-y-4">
                  {statItems.map((item, index) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between py-2 animate-fade-in"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{item.icon}</span>
                        <span className="text-sm text-white/60">{item.label}</span>
                      </div>
                      <span className="text-lg font-semibold text-[#fb6400]">
                        {item.value.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Input */}
            <div className="md:col-span-2">
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-white">输入文本</h2>
                  <button
                    onClick={() => setText('')}
                    className="text-sm text-white/40 hover:text-[#fb6400] transition-colors"
                  >
                    清空
                  </button>
                </div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="在此输入或粘贴文本..."
                  className="w-full h-96 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#fb6400] transition-all resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
