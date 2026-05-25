'use client';

import { Hook } from '@/lib/types';

interface Props {
  hook: Hook;
  index: number;
}

function getScoreColor(score: number): string {
  if (score >= 8) return 'text-emerald-400';
  if (score >= 6) return 'text-yellow-400';
  return 'text-orange-400';
}

function getScoreBg(score: number): string {
  if (score >= 8) return 'bg-emerald-500/10 border-emerald-500/20';
  if (score >= 6) return 'bg-yellow-500/10 border-yellow-500/20';
  return 'bg-orange-500/10 border-orange-500/20';
}

export default function HookCard({ hook, index }: Props) {
  const copyText = () => {
    navigator.clipboard.writeText(hook.text);
  };

  return (
    <div
      className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:bg-white/10 hover:border-white/20 transition-all duration-300 animate-fade-in"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* 序号 */}
      <div className="absolute -top-2 -left-2 w-7 h-7 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-lg">
        {index + 1}
      </div>

      {/* 风格标签和分数 */}
      <div className="flex items-center justify-between mb-3">
        <span className="px-2.5 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded-full text-xs text-purple-300 font-medium">
          {hook.style}
        </span>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${getScoreBg(hook.score)}`}>
          <span className="text-xs text-gray-400">点击欲</span>
          <span className={`text-sm font-bold ${getScoreColor(hook.score)}`}>{hook.score}</span>
        </div>
      </div>

      {/* Hook 文案 */}
      <p className="text-white text-base leading-relaxed mb-3 font-medium">
        {hook.text}
      </p>

      {/* 推荐理由 */}
      <p className="text-gray-400 text-xs leading-relaxed mb-3">
        {hook.reason}
      </p>

      {/* 复制按钮 */}
      <button
        onClick={copyText}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
        title="复制"
      >
        <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>
    </div>
  );
}
