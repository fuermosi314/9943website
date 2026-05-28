'use client';
import { useToolHistory } from '@/lib/useToolHistory';

import { useState } from 'react';
import BackButton from '@/components/BackButton';
import FullscreenButton from '@/components/FullscreenButton';
import { Platform, ContentType, Hook, GenerateResponse, HistoryRecord } from '@/lib/types';
import { saveHistory } from '@/lib/storage';
import TopicInput from '@/components/TopicInput';
import PlatformSelector from '@/components/PlatformSelector';
import ContentTypeSelector from '@/components/ContentTypeSelector';
import HookGrid from '@/components/HookGrid';
import ErrorBanner from '@/components/ErrorBanner';
import HistoryPanel from '@/components/HistoryPanel';

export default function HookGenerator() {
  useToolHistory('hook-generator');
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState<Platform>('xiaohongshu');
  const [contentType, setContentType] = useState<ContentType>('video');
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [historyKey, setHistoryKey] = useState(0);
  const [authenticated, setAuthenticated] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('hook-generator-auth') === 'true';
  });
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handlePasswordSubmit = async () => {
    const encoded = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    const hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    if (hash === 'fb8659cc7e7458605e62496877c123427700fb068851aff245693067e71bcebe') {
      localStorage.setItem('hook-generator-auth', 'true');
      setAuthenticated(true);
      setPasswordError('');
    } else {
      setPasswordError('密码错误');
    }
  };

  const canGenerate = authenticated && topic.trim().length > 0 && !loading;

  const handleGenerate = async () => {
    if (!canGenerate) return;

    setLoading(true);
    setError('');
    setHooks([]);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), platform, contentType }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '生成失败，请重试');
        return;
      }

      const parsed = data as GenerateResponse;
      setHooks(parsed.hooks);

      const record: HistoryRecord = {
        id: Date.now().toString(),
        topic: topic.trim(),
        platform,
        contentType,
        hooks: parsed.hooks,
        createdAt: new Date().toISOString(),
      };
      saveHistory(record);
      setHistoryKey((k) => k + 1);
    } catch {
      setError('网络连接失败，请检查网络后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleHistorySelect = (record: HistoryRecord) => {
    setTopic(record.topic);
    setPlatform(record.platform);
    setContentType(record.contentType);
    setHooks(record.hooks);
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      {/* 顶部导航 */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center">
          <BackButton toolId="hook-generator" className="hover:text-purple-400" />
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/30">
              <span className="text-white text-sm">🎯</span>
            </div>
            <h1 className="text-lg font-semibold text-white">爆款开头生成器</h1>
          </div>
        </div>
        <FullscreenButton />
      </header>

      <div className="relative z-10 max-w-4xl mx-auto px-4 pt-20 pb-16">
        {!authenticated ? (
          /* 密码验证 */
          <div className="max-w-sm mx-auto mt-20">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                <span className="text-2xl">🔒</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">需要验证</h2>
              <p className="text-gray-400 text-sm">请输入密码以使用此工具</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                placeholder="请输入密码"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500 transition-colors"
              />
              {passwordError && (
                <p className="text-red-400 text-sm">{passwordError}</p>
              )}
              <button
                onClick={handlePasswordSubmit}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl text-white font-semibold transition-all"
              >
                确认
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="text-center mb-10">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                AI Hook Lab
              </h1>
              <p className="mt-3 text-gray-400 text-lg">
                输入主题，AI 帮你生成10个不同风格的爆款开头
              </p>
            </header>

            {/* 输入区域 */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6 space-y-5">
              <TopicInput value={topic} onChange={setTopic} />
              <PlatformSelector value={platform} onChange={setPlatform} />
              <ContentTypeSelector value={contentType} onChange={setContentType} />

              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 rounded-xl text-white font-bold text-lg transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    生成中…
                  </span>
                ) : (
                  '生成爆款 Hook'
                )}
              </button>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="mb-6">
                <ErrorBanner message={error} onDismiss={() => setError('')} />
              </div>
            )}

            {/* 结果区域 */}
            <HookGrid hooks={hooks} loading={loading} />
          </>
        )}
      </div>

      {/* 历史面板 */}
      <HistoryPanel onSelect={handleHistorySelect} refreshKey={historyKey} />
    </div>
  );
}
