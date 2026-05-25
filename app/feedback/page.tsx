'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function FeedbackPage() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: '9fbbd080-d6e7-4bcd-9e78-27e79736cde6',
          name: formData.name,
          email: formData.email,
          message: formData.message,
          from_name: '9943小工具大全 - 用户反馈',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatus('success');
        setFormData({ name: '', email: '', message: '' });
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen relative z-10">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center">
          <Link
            href="/"
            className="flex items-center text-white/60 hover:text-[#fb6400] transition-colors mr-6"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </Link>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#fb6400] to-[#ff8c00] rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/30">
              <span className="text-white text-sm">💬</span>
            </div>
            <h1 className="text-lg font-semibold text-white">意见反馈</h1>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 pt-24 pb-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">你的建议很重要</h2>
          <p className="text-white/40 text-sm">有任何建议、反馈或需求，欢迎告诉帅气的作者</p>
        </div>

        {status === 'success' ? (
          <div className="glass-card p-8 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-xl font-semibold text-white mb-2">感谢你的反馈！</h3>
            <p className="text-white/40 text-sm mb-6">帅气的作者会认真阅读你的建议</p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white font-medium rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all"
            >
              返回首页
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
            <div>
              <label className="block text-sm text-white/60 mb-2">昵称（选填）</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="怎么称呼你"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#fb6400] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-2">邮箱（选填）</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="方便帅气的作者联系你"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#fb6400] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-2">你的建议 *</label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="告诉帅气的作者你的想法..."
                required
                rows={5}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#fb6400] transition-colors resize-none"
              />
            </div>

            {status === 'error' && (
              <p className="text-red-400 text-sm text-center">发送失败，请稍后再试</p>
            )}

            <button
              type="submit"
              disabled={status === 'sending' || !formData.message.trim()}
              className="w-full py-3.5 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white font-bold rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'sending' ? '发送中...' : '提交反馈'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
