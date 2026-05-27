'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FurnitureType } from '@/lib/tianjige-db';
import { FURNITURE_DEFAULTS } from './FurnitureRenderer';

interface FurniturePickerProps {
  show: boolean;
  currentSceneName: string;
  onClose: () => void;
  onAdd: (type: FurnitureType) => void;
  onAddCustom: (name: string, shape: 'box' | 'cylinder' | 'l-shape', w: number, h: number, d: number, color: string) => void;
}

// ── Scene → tab key mapping ─────────────────────────────────────────
const SCENE_TO_TAB: Record<string, string> = {
  '客厅': 'living',
  '卧室': 'bedroom',
  '厨房': 'kitchen',
  '卫生间': 'bathroom',
  '大学宿舍': 'dorm',
};

// ── Scene tabs ──────────────────────────────────────────────────────
interface SceneTab {
  key: string;
  label: string;
  emoji: string;
  types: FurnitureType[];
  // Sub-categories within the scene
  subCategories?: { label: string; types: FurnitureType[] }[];
}

const SCENE_TABS: SceneTab[] = [
  {
    key: 'all', label: '全部', emoji: '📋',
    types: Object.keys(FURNITURE_DEFAULTS).filter(t => t !== 'custom') as FurnitureType[],
    subCategories: [
      { label: '床/坐', types: ['bed', 'sofa'] },
      { label: '桌类', types: ['dining-table', 'coffee-table', 'desk'] },
      { label: '柜类', types: ['wardrobe', 'bookshelf', 'shoe-cabinet', 'nightstand', 'drawer-cabinet', 'tv-cabinet'] },
      { label: '电器', types: ['fridge', 'washing-machine'] },
      { label: '清洁', types: ['sink'] },
    ],
  },
  {
    key: 'living', label: '客厅', emoji: '🛋️',
    types: ['sofa', 'coffee-table', 'tv-cabinet'],
    subCategories: [
      { label: '坐类', types: ['sofa'] },
      { label: '桌类', types: ['coffee-table'] },
      { label: '柜类', types: ['tv-cabinet'] },
    ],
  },
  {
    key: 'bedroom', label: '卧室', emoji: '🛏️',
    types: ['bed', 'nightstand', 'wardrobe'],
    subCategories: [
      { label: '床类', types: ['bed'] },
      { label: '柜类', types: ['nightstand', 'wardrobe'] },
    ],
  },
  {
    key: 'kitchen', label: '厨房', emoji: '🍳',
    types: ['dining-table', 'fridge', 'sink'],
    subCategories: [
      { label: '桌类', types: ['dining-table'] },
      { label: '电器', types: ['fridge'] },
      { label: '清洁', types: ['sink'] },
    ],
  },
  {
    key: 'bathroom', label: '卫生间', emoji: '🚿',
    types: ['sink', 'washing-machine'],
    subCategories: [
      { label: '清洁', types: ['sink', 'washing-machine'] },
    ],
  },
  {
    key: 'dorm', label: '宿舍', emoji: '🏫',
    types: ['bed', 'desk', 'bookshelf'],
    subCategories: [
      { label: '床类', types: ['bed'] },
      { label: '桌类', types: ['desk'] },
      { label: '柜类', types: ['bookshelf'] },
    ],
  },
  {
    key: 'storage', label: '收纳', emoji: '📦',
    types: ['shoe-cabinet', 'drawer-cabinet'],
    subCategories: [
      { label: '柜类', types: ['shoe-cabinet', 'drawer-cabinet'] },
    ],
  },
];

// ── Custom Furniture Preview Canvas ─────────────────────────────────
function CustomPreview({ shape, w, h, d, color }: {
  shape: 'box' | 'cylinder' | 'l-shape';
  w: number; h: number; d: number;
  color: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Scale to fit
    const maxDim = Math.max(0.01, w, h, d);
    const scale = (W * 0.5) / maxDim;
    const sw = w * scale;
    const sh = h * scale;
    const sd = d * scale * 0.5; // depth foreshortening

    // Isometric offset
    const cx = W / 2;
    const cy = H / 2 + 10;

    // Draw isometric box helper
    const drawBox = (bw: number, bh: number, bd: number, ox: number, oy: number) => {
      // Front face
      ctx.fillStyle = color;
      ctx.fillRect(cx - bw / 2 + ox, cy - bh / 2 + oy, bw, bh);

      // Top face (lighter)
      ctx.fillStyle = lightenColor(color, 30);
      ctx.beginPath();
      ctx.moveTo(cx - bw / 2 + ox, cy - bh / 2 + oy);
      ctx.lineTo(cx - bw / 2 + ox + bd, cy - bh / 2 + oy - bd);
      ctx.lineTo(cx + bw / 2 + ox + bd, cy - bh / 2 + oy - bd);
      ctx.lineTo(cx + bw / 2 + ox, cy - bh / 2 + oy);
      ctx.closePath();
      ctx.fill();

      // Right face (darker)
      ctx.fillStyle = darkenColor(color, 20);
      ctx.beginPath();
      ctx.moveTo(cx + bw / 2 + ox, cy - bh / 2 + oy);
      ctx.lineTo(cx + bw / 2 + ox + bd, cy - bh / 2 + oy - bd);
      ctx.lineTo(cx + bw / 2 + ox + bd, cy + bh / 2 + oy - bd);
      ctx.lineTo(cx + bw / 2 + ox, cy + bh / 2 + oy);
      ctx.closePath();
      ctx.fill();

      // Edges
      ctx.strokeStyle = darkenColor(color, 40);
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - bw / 2 + ox, cy - bh / 2 + oy, bw, bh);
    };

    if (shape === 'box') {
      drawBox(sw, sh, sd, 0, 0);
    } else if (shape === 'cylinder') {
      // Draw cylinder
      const radius = Math.min(sw, sh) / 2;
      const ellipseH = sd * 0.6;

      // Body
      ctx.fillStyle = color;
      ctx.fillRect(cx - radius, cy - sh / 2, radius * 2, sh);

      // Top ellipse
      ctx.fillStyle = lightenColor(color, 30);
      ctx.beginPath();
      ctx.ellipse(cx, cy - sh / 2, radius, ellipseH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = darkenColor(color, 30);
      ctx.lineWidth = 1;
      ctx.stroke();

      // Bottom ellipse
      ctx.fillStyle = darkenColor(color, 20);
      ctx.beginPath();
      ctx.ellipse(cx, cy + sh / 2, radius, ellipseH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Side lines
      ctx.strokeStyle = darkenColor(color, 30);
      ctx.beginPath();
      ctx.moveTo(cx - radius, cy - sh / 2);
      ctx.lineTo(cx - radius, cy + sh / 2);
      ctx.moveTo(cx + radius, cy - sh / 2);
      ctx.lineTo(cx + radius, cy + sh / 2);
      ctx.stroke();
    } else {
      // L-shape: two boxes
      const halfW = sw * 0.45;
      const halfH = sh * 0.6;
      // Vertical part
      drawBox(halfW, sh, sd, -sw * 0.25, 0);
      // Horizontal part
      drawBox(sw, halfH, sd, 0, sh * 0.2);
    }

    // Dimension labels
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${w}m`, cx, cy + sh / 2 + 20);
    ctx.textAlign = 'right';
    ctx.fillText(`${h}m`, cx - sw / 2 - 5, cy);
    ctx.textAlign = 'left';
    ctx.fillText(`${d}m`, cx + sw / 2 + sd + 5, cy - sh / 2 - sd);
  }, [shape, w, h, d, color]);

  return (
    <canvas
      ref={canvasRef}
      width={160}
      height={120}
      className="w-full rounded-lg bg-black/30 border border-white/10"
    />
  );
}

function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}

function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return `rgb(${r},${g},${b})`;
}

// ── Main Component ──────────────────────────────────────────────────
export default function FurniturePicker({ show, currentSceneName, onClose, onAdd, onAddCustom }: FurniturePickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('自定义家具');
  const [customShape, setCustomShape] = useState<'box' | 'cylinder' | 'l-shape'>('box');
  const [customW, setCustomW] = useState(0.8);
  const [customH, setCustomH] = useState(0.8);
  const [customD, setCustomD] = useState(0.4);
  const [customColor, setCustomColor] = useState('#8B7355');

  // Default tab based on current scene
  const defaultTab = useMemo(() => {
    return SCENE_TO_TAB[currentSceneName] ?? 'all';
  }, [currentSceneName]);
  const [activeScene, setActiveScene] = useState(defaultTab);

  // Reset tab when picker opens or scene changes
  useEffect(() => {
    if (show) {
      setActiveScene(SCENE_TO_TAB[currentSceneName] ?? 'all');
      setSearchQuery('');
      setShowCustom(false);
    }
  }, [show, currentSceneName]);

  const activeTab = useMemo(() => {
    return SCENE_TABS.find(s => s.key === activeScene) ?? SCENE_TABS[0];
  }, [activeScene]);

  // Filter by search
  const displayTypes = useMemo(() => {
    if (!searchQuery.trim()) return activeTab.types;
    const q = searchQuery.toLowerCase();
    return activeTab.types.filter(type => {
      const def = FURNITURE_DEFAULTS[type];
      return def.name.toLowerCase().includes(q) || type.toLowerCase().includes(q);
    });
  }, [activeTab, searchQuery]);

  // Group by sub-categories
  const groupedTypes = useMemo(() => {
    if (!activeTab.subCategories || searchQuery.trim()) {
      return null; // flat list when searching or no sub-categories
    }
    // Filter sub-categories to only include types that exist in displayTypes
    return activeTab.subCategories
      .map(sub => ({
        label: sub.label,
        types: sub.types.filter(t => displayTypes.includes(t)),
      }))
      .filter(g => g.types.length > 0);
  }, [activeTab, displayTypes, searchQuery]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <style>{`.furniture-picker-tabs::-webkit-scrollbar{display:none}`}</style>
      <div className="bg-[#1a1a2e] rounded-t-2xl sm:rounded-2xl border border-white/10 w-full sm:max-w-lg max-h-[80vh] sm:max-h-[70vh] overflow-y-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold">添加家具</h3>
          <button onClick={onClose}
            className="text-white/50 hover:text-white text-xl">&times;</button>
        </div>

        {/* 搜索框 */}
        <div className="mb-3">
          <input type="text" placeholder="🔍 搜索家具..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-black/30 backdrop-blur text-white px-3 py-2 rounded-lg border border-white/20 text-sm placeholder-white/40 focus:border-[#fb6400] outline-none" />
        </div>

        {/* 场景标签 */}
        <div className="relative scroll-fade-right">
        <div className="furniture-picker-tabs mb-4 overflow-x-auto -mx-4 px-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}>
          <div className="flex gap-2 w-max">
            {SCENE_TABS.map(s => (
              <button key={s.key} onClick={() => setActiveScene(s.key)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors border ${
                  activeScene === s.key
                    ? 'bg-[#fb6400]/20 border-[#fb6400] text-white'
                    : 'bg-black/20 border-white/10 text-white/60 hover:border-white/30'
                }`}>
                <span>{s.emoji}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
        </div>

        {/* Furniture list - grouped or flat */}
        {displayTypes.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-8">未找到匹配的家具</p>
        ) : groupedTypes ? (
          // Grouped by sub-category
          <div className="space-y-4">
            {groupedTypes.map(group => (
              <div key={group.label}>
                <h4 className="text-white/40 text-xs mb-2 px-1">{group.label}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {group.types.map(type => {
                    const def = FURNITURE_DEFAULTS[type];
                    return (
                      <button key={type} onClick={() => onAdd(type)}
                        className="glass-card p-3 rounded-xl text-center hover:border-[#fb6400]/30 transition-colors">
                        <div className="text-2xl mb-1">{def.emoji}</div>
                        <div className="text-white text-xs">{def.name}</div>
                        <div className="text-white/30 text-[10px] mt-0.5">{def.w}×{def.d}m</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Flat list (all tab or searching)
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {displayTypes.map(type => {
              const def = FURNITURE_DEFAULTS[type];
              return (
                <button key={type} onClick={() => onAdd(type)}
                  className="glass-card p-3 rounded-xl text-center hover:border-[#fb6400]/30 transition-colors">
                  <div className="text-2xl mb-1">{def.emoji}</div>
                  <div className="text-white text-xs">{def.name}</div>
                  <div className="text-white/30 text-[10px] mt-0.5">{def.w}×{def.d}m</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Custom furniture section */}
        <div className="border-t border-white/10 mt-4 pt-4">
          <button onClick={() => setShowCustom(!showCustom)}
            className="w-full glass-card p-3 rounded-xl text-center hover:border-[#fb6400]/30 transition-colors flex items-center justify-center gap-2">
            <span className="text-xl">🔧</span>
            <span className="text-white text-sm font-medium">自定义家具</span>
            <span className="text-white/40 text-xs">{showCustom ? '▲' : '▼'}</span>
          </button>

          {showCustom && (
            <div className="mt-3 space-y-3">
              {/* Preview */}
              <CustomPreview shape={customShape} w={customW} h={customH} d={customD} color={customColor} />

              {/* Name */}
              <div>
                <label className="text-white/50 text-xs block mb-1">名称</label>
                <input type="text" value={customName} onChange={e => setCustomName(e.target.value)}
                  className="w-full bg-black/30 text-white px-3 py-1.5 rounded-lg border border-white/20 text-sm focus:border-[#fb6400] outline-none" />
              </div>

              {/* Shape */}
              <div>
                <label className="text-white/50 text-xs block mb-1">形状</label>
                <div className="flex gap-2">
                  {([
                    { shape: 'box' as const, emoji: '🟦', label: '方块' },
                    { shape: 'cylinder' as const, emoji: '🟢', label: '圆柱' },
                    { shape: 'l-shape' as const, emoji: '🟧', label: 'L形' },
                  ]).map(s => (
                    <button key={s.shape} onClick={() => setCustomShape(s.shape)}
                      className={`flex-1 py-2 rounded-lg text-xs text-center transition-colors border ${
                        customShape === s.shape
                          ? 'bg-[#fb6400]/20 border-[#fb6400] text-white'
                          : 'bg-black/20 border-white/10 text-white/60 hover:border-white/30'
                      }`}>
                      <div className="text-lg">{s.emoji}</div>
                      <div>{s.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Size */}
              <div>
                <label className="text-white/50 text-xs block mb-1">尺寸 (米)</label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-white/40 text-xs">宽</span>
                    <input type="number" value={customW} min={0.2} max={3.0} step={0.1}
                      onChange={e => setCustomW(Math.max(0.2, Math.min(3.0, Number(e.target.value))))}
                      className="w-full bg-black/30 text-white px-2 py-1 rounded-lg border border-white/20 text-sm focus:border-[#fb6400] outline-none" />
                  </div>
                  <div>
                    <span className="text-white/40 text-xs">高</span>
                    <input type="number" value={customH} min={0.2} max={3.0} step={0.1}
                      onChange={e => setCustomH(Math.max(0.2, Math.min(3.0, Number(e.target.value))))}
                      className="w-full bg-black/30 text-white px-2 py-1 rounded-lg border border-white/20 text-sm focus:border-[#fb6400] outline-none" />
                  </div>
                  <div>
                    <span className="text-white/40 text-xs">深</span>
                    <input type="number" value={customD} min={0.2} max={3.0} step={0.1}
                      onChange={e => setCustomD(Math.max(0.2, Math.min(3.0, Number(e.target.value))))}
                      className="w-full bg-black/30 text-white px-2 py-1 rounded-lg border border-white/20 text-sm focus:border-[#fb6400] outline-none" />
                  </div>
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="text-white/50 text-xs block mb-1">颜色</label>
                <input type="color" value={customColor} onChange={e => setCustomColor(e.target.value)}
                  className="w-full h-8 rounded-lg border border-white/20 cursor-pointer bg-transparent" />
              </div>

              {/* Add button */}
              <button onClick={() => onAddCustom(customName, customShape, customW, customH, customD, customColor)}
                className="w-full py-2.5 bg-[#fb6400] hover:bg-[#e55a00] text-white rounded-xl text-sm font-medium transition-colors">
                添加到场景
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
