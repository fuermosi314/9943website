'use client';
import { useToolHistory } from '@/lib/useToolHistory';

import { useState, useCallback } from 'react';
import BackButton from '@/components/BackButton';

type Mode = 'number' | 'string' | 'uuid' | 'password';

function generateRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generatePassword(length: number): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const all = uppercase + lowercase + numbers + symbols;

  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  for (let i = 4; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

export default function RandomGenerator() {
  useToolHistory('random-generator');
  const [mode, setMode] = useState<Mode>('number');
  const [minVal, setMinVal] = useState('1');
  const [maxVal, setMaxVal] = useState('100');
  const [strLength, setStrLength] = useState('16');
  const [pwdLength, setPwdLength] = useState('16');
  const [count, setCount] = useState('1');
  const [results, setResults] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = useCallback((text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  }, []);

  const handleCopyAll = useCallback(() => {
    navigator.clipboard.writeText(results.join('\n'));
    setCopiedIndex(-1);
    setTimeout(() => setCopiedIndex(null), 1500);
  }, [results]);

  const handleGenerate = useCallback(() => {
    const n = Math.min(Math.max(parseInt(count) || 1, 1), 100);
    const res: string[] = [];

    for (let i = 0; i < n; i++) {
      switch (mode) {
        case 'number': {
          const min = parseInt(minVal) || 0;
          const max = parseInt(maxVal) || 100;
          res.push(String(generateRandomNumber(Math.min(min, max), Math.max(min, max))));
          break;
        }
        case 'string':
          res.push(generateRandomString(Math.min(Math.max(parseInt(strLength) || 16, 1), 256)));
          break;
        case 'uuid':
          res.push(generateUUID());
          break;
        case 'password':
          res.push(generatePassword(Math.min(Math.max(parseInt(pwdLength) || 16, 4), 128)));
          break;
      }
    }

    setResults(res);
    setCopiedIndex(null);
  }, [mode, minVal, maxVal, strLength, pwdLength, count]);

  const modes: { key: Mode; label: string; icon: string }[] = [
    { key: 'number', label: '随机数', icon: '🔢' },
    { key: 'string', label: '随机字符串', icon: '🔤' },
    { key: 'uuid', label: 'UUID', icon: '🆔' },
    { key: 'password', label: '密码', icon: '🔐' },
  ];

  return (
    <div className="min-h-screen relative z-10">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center">
          <BackButton toolId="random-generator" />
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="9943" className="w-8 h-8 rounded-lg shadow-lg shadow-orange-500/30" />
            <h1 className="text-lg font-semibold text-white">随机数生成器</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        <div className="animate-fade-in animate-slide-up">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 结果显示 */}
            <div className="md:col-span-1">
              <div className="glass-card p-6 sticky top-28">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-semibold text-white">生成结果</h2>
                  {results.length > 1 && (
                    <button
                      onClick={handleCopyAll}
                      className="text-xs text-white/40 hover:text-[#fb6400] transition-colors"
                    >
                      {copiedIndex === -1 ? '已复制' : '复制全部'}
                    </button>
                  )}
                </div>

                {results.length > 0 ? (
                  <div className="space-y-2 animate-fade-in">
                    {results.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 group"
                      >
                        <span className="text-sm text-white font-mono truncate mr-2 flex-1">
                          {item}
                        </span>
                        <button
                          onClick={() => handleCopy(item, i)}
                          className="shrink-0 text-xs text-white/30 hover:text-[#fb6400] transition-colors opacity-0 group-hover:opacity-100"
                        >
                          {copiedIndex === i ? '✓' : '复制'}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">🎲</div>
                    <p className="text-sm text-white/40">
                      选择模式并点击生成
                      <br />
                      获取随机结果
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 设置区域 */}
            <div className="md:col-span-2 space-y-6">
              {/* 模式选择 */}
              <div className="glass-card p-6">
                <h2 className="text-base font-semibold text-white mb-4">生成模式</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {modes.map((m) => (
                    <button
                      key={m.key}
                      onClick={() => {
                        setMode(m.key);
                        setResults([]);
                      }}
                      className={`py-3 rounded-xl text-sm font-medium transition-all ${
                        mode === m.key
                          ? 'bg-[#fb6400] text-white shadow-lg shadow-orange-500/30'
                          : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      <span className="block text-lg mb-1">{m.icon}</span>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 参数设置 */}
              <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
                <h2 className="text-base font-semibold text-white mb-4">参数设置</h2>

                {mode === 'number' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-white/60 mb-2">最小值</label>
                      <input
                        type="number"
                        value={minVal}
                        onChange={(e) => setMinVal(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#fb6400] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/60 mb-2">最大值</label>
                      <input
                        type="number"
                        value={maxVal}
                        onChange={(e) => setMaxVal(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#fb6400] transition-all"
                      />
                    </div>
                  </div>
                )}

                {mode === 'string' && (
                  <div>
                    <label className="block text-sm text-white/60 mb-2">字符串长度</label>
                    <input
                      type="number"
                      value={strLength}
                      onChange={(e) => setStrLength(e.target.value)}
                      min="1"
                      max="256"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#fb6400] transition-all"
                    />
                    <p className="mt-2 text-xs text-white/30">包含大小写字母和数字，长度 1-256</p>
                  </div>
                )}

                {mode === 'uuid' && (
                  <p className="text-sm text-white/60">
                    UUID (通用唯一标识符) 将自动生成标准 v4 格式。
                  </p>
                )}

                {mode === 'password' && (
                  <div>
                    <label className="block text-sm text-white/60 mb-2">密码长度</label>
                    <input
                      type="number"
                      value={pwdLength}
                      onChange={(e) => setPwdLength(e.target.value)}
                      min="4"
                      max="128"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#fb6400] transition-all"
                    />
                    <p className="mt-2 text-xs text-white/30">
                      包含大小写字母、数字和特殊符号，长度 4-128
                    </p>
                  </div>
                )}
              </div>

              {/* 生成数量 */}
              <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
                <h2 className="text-base font-semibold text-white mb-4">生成数量</h2>
                <input
                  type="number"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  min="1"
                  max="100"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#fb6400] transition-all"
                />
                <p className="mt-2 text-xs text-white/30">一次最多生成 100 个</p>
              </div>

              {/* 生成按钮 */}
              <button
                onClick={handleGenerate}
                className="w-full py-4 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white font-semibold rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all active:scale-[0.98]"
              >
                生成
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
