'use client';
import { useToolHistory } from '@/lib/useToolHistory';

import { useState, useRef, useCallback, useEffect } from 'react';
import BackButton from '@/components/BackButton';

// 预设模板
const presets: Record<string, string[]> = {
  '今天吃什么？': ['火锅', '烧烤', '麻辣烫', '寿司', '披萨', '炒饭', '面条', '饺子', '汉堡', '沙拉'],
  '谁请客？': ['小明', '小红', '小刚', '小丽', '小华'],
  '真心话大冒险': ['真心话', '大冒险'],
  '做什么运动？': ['跑步', '游泳', '篮球', '瑜伽', '健身', '羽毛球', '足球', '骑行'],
  '看什么电影？': ['动作片', '喜剧片', '科幻片', '恐怖片', '爱情片', '纪录片', '动画片', '悬疑片'],
  '自定义': [],
};

// 渐变色板
const gradients = [
  ['#ff6b6b', '#ee5a24'],
  ['#feca57', '#ff9ff3'],
  ['#48dbfb', '#0abde3'],
  ['#ff9ff3', '#f368e0'],
  ['#54a0ff', '#2e86de'],
  ['#5f27cd', '#341f97'],
  ['#01a3a4', '#00b894'],
  ['#f368e0', '#e056c0'],
];

interface WheelItem {
  id: string;
  text: string;
  color: string;
}

interface HistoryItem {
  result: string;
  timestamp: number;
}

interface CustomPreset {
  name: string;
  items: string[];
}

export default function WheelPage() {
  useToolHistory('wheel');
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('wheel-custom-presets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [items, setItems] = useState<WheelItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('wheel-current-items');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    const defaultItems = presets['今天吃什么？'];
    return defaultItems.map((text, i) => ({
      id: `item-${i}`,
      text,
      color: gradients[i % gradients.length][0],
    }));
  });

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [resultIndex, setResultIndex] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activePreset, setActivePreset] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('wheel-active-preset') || '今天吃什么？';
      } catch {}
    }
    return '今天吃什么？';
  });
  const [newItemText, setNewItemText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const audioContextRef = useRef<AudioContext | null>(null);
  const wheelRef = useRef<SVGSVGElement>(null);

  // 加载历史记录
  useEffect(() => {
    const saved = localStorage.getItem('wheel-history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  // 保存历史记录
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('wheel-history', JSON.stringify(history.slice(0, 50)));
    }
  }, [history]);

  // 保存自定义类别
  useEffect(() => {
    localStorage.setItem('wheel-custom-presets', JSON.stringify(customPresets));
  }, [customPresets]);

  // 保存当前选项
  useEffect(() => {
    localStorage.setItem('wheel-current-items', JSON.stringify(items));
  }, [items]);

  // 保存当前选中的类别
  useEffect(() => {
    localStorage.setItem('wheel-active-preset', activePreset);
  }, [activePreset]);

  // 初始化音频上下文
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // 播放滴答声
  const playTick = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.1;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {}
  }, [soundEnabled, getAudioContext]);

  // 播放停止音效
  const playStop = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 600;
      gain.gain.value = 0.2;
      osc.start();
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  }, [soundEnabled, getAudioContext]);

  // 播放中奖音效
  const playWin = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.value = 0.15;
        osc.start(ctx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.2);
        osc.stop(ctx.currentTime + i * 0.1 + 0.2);
      });
    } catch (e) {}
  }, [soundEnabled, getAudioContext]);

  // 开始旋转
  const handleSpin = useCallback(() => {
    if (spinning || items.length < 2) return;

    setSpinning(true);
    setResult(null);
    setResultIndex(null);

    // 随机旋转角度 (至少转5圈)
    const extraRotation = Math.random() * 360 + 1800;
    const newRotation = rotation + extraRotation;
    setRotation(newRotation);

    // 滴答声定时器（降低频率以优化性能）
    let tickCount = 0;
    const tickInterval = setInterval(() => {
      playTick();
      tickCount++;
      if (tickCount > 20) clearInterval(tickInterval);
    }, 150);

    // 5秒后停止
    setTimeout(() => {
      clearInterval(tickInterval);
      playStop();

      // 计算结果
      const normalizedAngle = newRotation % 360;
      const sectorAngle = 360 / items.length;
      // 扇区从270度开始绘制，计算旋转后哪个扇区在270度位置
      const selectedIndex = Math.floor(((360 - normalizedAngle) % 360) / sectorAngle) % items.length;

      setResult(items[selectedIndex].text);
      setResultIndex(selectedIndex);
      setSpinning(false);

      // 记录历史
      setHistory(prev => [{
        result: items[selectedIndex].text,
        timestamp: Date.now(),
      }, ...prev].slice(0, 50));

      // 播放中奖音效
      setTimeout(() => playWin(), 300);
    }, 5000);
  }, [spinning, items, rotation, playTick, playStop, playWin]);

  // 添加选项
  const addItem = useCallback(() => {
    if (!newItemText.trim()) return;
    const newItem: WheelItem = {
      id: `item-${Date.now()}`,
      text: newItemText.trim(),
      color: gradients[items.length % gradients.length][0],
    };
    setItems(prev => [...prev, newItem]);
    setNewItemText('');
  }, [newItemText, items.length]);

  // 删除选项
  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    if (resultIndex !== null) {
      setResult(null);
      setResultIndex(null);
    }
  }, [resultIndex]);

  // 开始编辑
  const startEdit = useCallback((item: WheelItem) => {
    setEditingId(item.id);
    setEditText(item.text);
  }, []);

  // 保存编辑
  const saveEdit = useCallback(() => {
    if (!editingId || !editText.trim()) return;
    setItems(prev => prev.map(item =>
      item.id === editingId ? { ...item, text: editText.trim() } : item
    ));
    setEditingId(null);
    setEditText('');
  }, [editingId, editText]);

  // 加载预设
  const loadPreset = useCallback((presetName: string) => {
    setActivePreset(presetName);
    const presetItems = presets[presetName] || customPresets.find(p => p.name === presetName)?.items || [];
    setItems(presetItems.map((text, i) => ({
      id: `item-${i}`,
      text,
      color: gradients[i % gradients.length][0],
    })));
    setResult(null);
    setResultIndex(null);
  }, [customPresets]);

  // 保存当前选项为自定义类别
  const saveAsCustomPreset = useCallback((name: string) => {
    if (!name.trim() || items.length === 0) return;
    const newPreset: CustomPreset = {
      name: name.trim(),
      items: items.map(item => item.text),
    };
    setCustomPresets(prev => {
      const existing = prev.findIndex(p => p.name === name.trim());
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newPreset;
        return updated;
      }
      return [...prev, newPreset];
    });
    setActivePreset(name.trim());
  }, [items]);

  // 删除自定义类别
  const deleteCustomPreset = useCallback((name: string) => {
    setCustomPresets(prev => prev.filter(p => p.name !== name));
    if (activePreset === name) {
      setActivePreset('今天吃什么？');
      loadPreset('今天吃什么？');
    }
  }, [activePreset, loadPreset]);

  // 清空历史
  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem('wheel-history');
  }, []);

  // 生成 SVG 扇形路径
  const getSectorPath = useCallback((index: number, total: number) => {
    const angle = (360 / total) * (Math.PI / 180);
    const startAngle = angle * index - Math.PI / 2;
    const endAngle = startAngle + angle;
    const x1 = 150 + 140 * Math.cos(startAngle);
    const y1 = 150 + 140 * Math.sin(startAngle);
    const x2 = 150 + 140 * Math.cos(endAngle);
    const y2 = 150 + 140 * Math.sin(endAngle);
    return `M 150 150 L ${x1} ${y1} A 140 140 0 0 1 ${x2} ${y2} Z`;
  }, []);

  // 获取文本位置
  const getTextPosition = useCallback((index: number, total: number) => {
    const angle = ((360 / total) * index + 360 / total / 2) * (Math.PI / 180) - Math.PI / 2;
    const x = 150 + 90 * Math.cos(angle);
    const y = 150 + 90 * Math.sin(angle);
    const rotation = (360 / total) * index + 360 / total / 2;
    return { x, y, rotation };
  }, []);

  return (
    <div className="min-h-screen relative z-10">
      {/* 顶部导航 */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center">
          <BackButton toolId="wheel" />
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="9943" className="w-8 h-8 rounded-lg shadow-lg shadow-orange-500/30" />
            <h1 className="text-lg font-semibold text-white">大转盘</h1>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-6 pt-20 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：转盘区域 */}
          <div className="space-y-4">
            {/* 转盘容器 */}
            <div className="glass-card p-6">
              <div className="relative w-full max-w-[400px] mx-auto aspect-square">
                {/* 指针 */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
                  <div
                    className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[30px] drop-shadow-[0_0_12px_rgba(251,100,0,0.8)]"
                    style={{ borderTopColor: '#fb6400' }}
                  />
                </div>

                {/* SVG 转盘 */}
                <svg
                  ref={wheelRef}
                  viewBox="0 0 300 300"
                  className="w-full h-full"
                  style={{
                    transform: `rotate(${rotation}deg) translateZ(0)`,
                    transition: spinning
                      ? 'transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
                      : 'none',
                    willChange: spinning ? 'transform' : 'auto',
                    backfaceVisibility: 'hidden',
                    // 旋转时使用更轻量的阴影效果
                    filter: spinning
                      ? 'drop-shadow(0 0 20px rgba(251,100,0,0.4))'
                      : 'drop-shadow(0 0 15px rgba(251,100,0,0.3))',
                  }}
                >
                  <defs>
                    {gradients.map((grad, i) => (
                      <linearGradient key={i} id={`grad${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={grad[0]} />
                        <stop offset="100%" stopColor={grad[1]} />
                      </linearGradient>
                    ))}
                  </defs>

                  {/* 扇形 */}
                  {items.map((item, index) => {
                    const path = getSectorPath(index, items.length);
                    const textPos = getTextPosition(index, items.length);
                    const isWinner = resultIndex === index;

                    return (
                      <g key={item.id}>
                        <path
                          d={path}
                          fill={`url(#grad${index % gradients.length})`}
                          stroke="rgba(0,0,0,0.3)"
                          strokeWidth="1"
                          style={{
                            filter: isWinner && !spinning ? 'brightness(1.3)' : 'none',
                            animation: isWinner && !spinning ? 'pulse 1s infinite' : 'none',
                          }}
                        />
                        <text
                          x={textPos.x}
                          y={textPos.y}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize="14"
                          fontWeight="bold"
                          style={{
                            transform: `rotate(${textPos.rotation}deg)`,
                            transformOrigin: `${textPos.x}px ${textPos.y}px`,
                            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                          }}
                        >
                          {item.text.length > 6 ? item.text.slice(0, 6) + '..' : item.text}
                        </text>
                      </g>
                    );
                  })}

                  {/* 中心圆 */}
                  <circle cx="150" cy="150" r="25" fill="#1a1a2e" stroke="#fb6400" strokeWidth="3" />
                  <circle cx="150" cy="150" r="15" fill="#fb6400" />
                </svg>
              </div>

              {/* 开始按钮 */}
              <div className="text-center mt-6">
                <button
                  onClick={handleSpin}
                  disabled={spinning || items.length < 2}
                  className="px-12 py-4 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white text-xl font-bold rounded-full hover:shadow-lg hover:shadow-orange-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {spinning ? '旋转中...' : '开始'}
                </button>
              </div>

              {/* 结果显示 */}
              {result && !spinning && (
                <div className="mt-6 text-center animate-fade-in">
                  <div className="text-3xl font-bold text-[#fb6400] mb-2">{result}</div>
                  <div className="text-white/60">🎉 恭喜！</div>
                </div>
              )}
            </div>

            {/* 控制按钮 */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-3 glass-card hover:bg-white/10 transition-colors"
                title={soundEnabled ? '关闭音效' : '开启音效'}
              >
                {soundEnabled ? '🔊' : '🔇'}
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="p-3 glass-card hover:bg-white/10 transition-colors"
                title="历史记录"
              >
                📋
              </button>
            </div>

            {/* 历史记录 */}
            {showHistory && (
              <div className="glass-card p-6 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">历史记录</h3>
                  <button
                    onClick={clearHistory}
                    className="text-sm text-white/40 hover:text-[#fb6400]"
                  >
                    清空
                  </button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {history.length === 0 ? (
                    <div className="text-white/40 text-center py-4">暂无记录</div>
                  ) : (
                    history.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <span className="text-white">{item.result}</span>
                        <span className="text-white/40 text-sm">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 右侧：编辑面板 */}
          <div className="space-y-4">
            {/* 预设选择 */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">预设模板</h3>
              <div className="flex flex-wrap gap-2">
                {Object.keys(presets).filter(name => name !== '自定义').map((name) => (
                  <button
                    key={name}
                    onClick={() => loadPreset(name)}
                    className={`px-4 py-2 rounded-lg text-sm transition-all ${
                      activePreset === name
                        ? 'bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>

              {/* 自定义类别 */}
              {customPresets.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <h4 className="text-sm text-white/60 mb-3">我的类别</h4>
                  <div className="flex flex-wrap gap-2">
                    {customPresets.map((preset) => (
                      <div key={preset.name} className="flex items-center gap-1">
                        <button
                          onClick={() => loadPreset(preset.name)}
                          className={`px-4 py-2 rounded-lg text-sm transition-all ${
                            activePreset === preset.name
                              ? 'bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white'
                              : 'bg-white/10 text-white/70 hover:bg-white/20'
                          }`}
                        >
                          {preset.name}
                        </button>
                        <button
                          onClick={() => deleteCustomPreset(preset.name)}
                          className="p-1 text-white/40 hover:text-red-400 transition-colors"
                          title="删除类别"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 保存为自定义类别 */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <button
                  onClick={() => {
                    const name = prompt('请输入类别名称：');
                    if (name) saveAsCustomPreset(name);
                  }}
                  className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 border border-dashed border-white/20 rounded-lg text-sm text-white/60 hover:text-white transition-all"
                >
                  + 保存当前为自定义类别
                </button>
              </div>
            </div>

            {/* 选项列表 */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                选项列表
                <span className="text-sm text-white/40 ml-2">({items.length} 项)</span>
              </h3>

              {/* 添加选项 */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addItem()}
                  placeholder="输入新选项..."
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#fb6400]"
                />
                <button
                  onClick={addItem}
                  className="px-4 py-2 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white rounded-lg hover:shadow-lg hover:shadow-orange-500/30 transition-all"
                >
                  添加
                </button>
              </div>

              {/* 选项列表 */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                      resultIndex === index && !spinning
                        ? 'bg-[#fb6400]/20 border border-[#fb6400]'
                        : 'bg-white/5'
                    }`}
                  >
                    {/* 颜色指示器 */}
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${gradients[index % gradients.length][0]}, ${gradients[index % gradients.length][1]})` }}
                    />

                    {/* 编辑/显示文本 */}
                    {editingId === item.id ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                          className="flex-1 px-3 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:border-[#fb6400]"
                          autoFocus
                        />
                        <button onClick={saveEdit} className="text-[#fb6400] text-sm">保存</button>
                        <button onClick={() => setEditingId(null)} className="text-white/40 text-sm">取消</button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 text-white">{item.text}</span>
                        <button
                          onClick={() => startEdit(item)}
                          className="text-white/40 hover:text-[#fb6400] text-sm"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-white/40 hover:text-red-400 text-sm"
                        >
                          删除
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {items.length < 2 && (
                <div className="text-center text-white/40 py-4">
                  请至少添加 2 个选项
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* 脉冲动画样式 */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
