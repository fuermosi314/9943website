'use client';

import { Scene } from '@/lib/tianjige-db';

interface StatsPanelProps {
  show: boolean;
  scenes: Scene[];
  onClose: () => void;
}

export default function StatsPanel({ show, scenes, onClose }: StatsPanelProps) {
  if (!show) return null;

  const allItems = scenes.flatMap(s => s.furniture.flatMap(f => f.items));
  const totalItems = allItems.reduce((sum, i) => sum + i.quantity, 0);
  const totalValue = allItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const byScene = [...scenes].map(s => ({
    name: `${s.emoji} ${s.name}`,
    count: s.furniture.reduce((sum, f) => sum + f.items.reduce((s2, i) => s2 + i.quantity, 0), 0),
    value: s.furniture.reduce((sum, f) => sum + f.items.reduce((s2, i) => s2 + i.price * i.quantity, 0), 0),
  })).filter(s => s.count > 0);

  const categoryMap = new Map<string, { count: number; value: number }>();
  for (const item of allItems) {
    const existing = categoryMap.get(item.category) || { count: 0, value: 0 };
    existing.count += item.quantity;
    existing.value += item.price * item.quantity;
    categoryMap.set(item.category, existing);
  }
  const byCategory = Array.from(categoryMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1a2e] rounded-t-2xl sm:rounded-2xl border border-white/10 w-full max-w-md max-h-[70vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold">📊 资产统计</h3>
          <button onClick={onClose}
            className="text-white/50 hover:text-white text-xl">&times;</button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="glass-card p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-[#fb6400]">{totalItems}</div>
            <div className="text-white/50 text-xs">总物品数</div>
          </div>
          <div className="glass-card p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-[#fb6400]">¥{totalValue.toLocaleString()}</div>
            <div className="text-white/50 text-xs">总价值</div>
          </div>
        </div>

        {byScene.length > 0 && (
          <div className="mb-4">
            <h4 className="text-white/50 text-xs mb-2 uppercase tracking-wider">按场景</h4>
            {(() => { const max = Math.max(...byScene.map(s => s.count)); return byScene.map(s => (
              <div key={s.name} className="py-2 border-b border-white/5">
                <div className="flex justify-between mb-1">
                  <span className="text-white text-sm">{s.name}</span>
                  <span className="text-white/50 text-sm">{s.count}件 ¥{s.value.toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#fb6400] rounded-full transition-all" style={{ width: `${(s.count / max) * 100}%` }} />
                </div>
              </div>
            )); })()}
          </div>
        )}

        {byCategory.length > 0 && (
          <div>
            <h4 className="text-white/50 text-xs mb-2 uppercase tracking-wider">按分类</h4>
            {(() => { const max = Math.max(...byCategory.map(c => c.count)); return byCategory.map(c => (
              <div key={c.name} className="py-2 border-b border-white/5">
                <div className="flex justify-between mb-1">
                  <span className="text-white text-sm">{c.name}</span>
                  <span className="text-white/50 text-sm">{c.count}件 ¥{c.value.toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#fb6400] rounded-full transition-all" style={{ width: `${(c.count / max) * 100}%` }} />
                </div>
              </div>
            )); })()}
          </div>
        )}

        {allItems.length === 0 && (
          <p className="text-white/30 text-sm text-center py-8">还没有添加任何物品</p>
        )}
      </div>
    </div>
  );
}
