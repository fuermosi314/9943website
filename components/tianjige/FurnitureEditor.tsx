'use client';

import { Furniture } from '@/lib/tianjige-db';
import { FURNITURE_DEFAULTS } from './FurnitureRenderer';

interface EditForm {
  name: string;
  color: string;
  x: number;
  z: number;
  rotation: number;
  scale: number;
}

interface FurnitureEditorProps {
  show: boolean;
  editingFurniture: Furniture | null;
  editForm: EditForm;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  onMove: () => void;
  setEditForm: (fn: (prev: EditForm) => EditForm) => void;
}

export default function FurnitureEditor({
  show, editingFurniture, editForm, onClose, onSave, onDelete, onMove, setEditForm,
}: FurnitureEditorProps) {
  if (!show || !editingFurniture) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1a2e] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md mx-0 sm:mx-4 border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-white text-lg font-bold">编辑家具</h3>
          <button onClick={onClose}
            className="text-white/50 hover:text-white text-xl">&times;</button>
        </div>
        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="text-white/70 text-sm mb-1 block">名称</label>
            <input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fb6400]" />
          </div>
          {/* Color */}
          <div>
            <label className="text-white/70 text-sm mb-1 block">颜色</label>
            <div className="flex items-center gap-2">
              <input type="color" value={editForm.color || FURNITURE_DEFAULTS[editingFurniture.type].color}
                onChange={e => setEditForm(f => ({ ...f, color: e.target.value }))}
                className="w-10 h-10 rounded cursor-pointer bg-transparent border-0" />
              <span className="text-white/50 text-sm">{editForm.color || '默认'}</span>
              <button onClick={() => setEditForm(f => ({ ...f, color: '' }))}
                className="ml-auto px-3 py-1 text-xs text-white/70 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors">
                恢复默认
              </button>
            </div>
          </div>
          {/* Position */}
          <div>
            <label className="text-white/70 text-sm mb-1 block">位置</label>
            <p className="text-white/30 text-xs mb-2">在物品面板点击移动按钮，或点击下方按钮</p>
            <button onClick={onMove}
              className="w-full py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg text-sm border border-white/10 transition-colors">
              📍 移动位置
            </button>
          </div>
          {/* Rotation */}
          <div>
            <label className="text-white/70 text-sm mb-1 block">旋转 ({editForm.rotation}°)</label>
            <div className="flex gap-2">
              <button onClick={() => setEditForm(f => ({ ...f, rotation: (f.rotation - 90 + 360) % 360 }))}
                className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm border border-white/10 transition-colors">
                ↺ 左旋
              </button>
              <button onClick={() => setEditForm(f => ({ ...f, rotation: (f.rotation + 90) % 360 }))}
                className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm border border-white/10 transition-colors">
                ↻ 右旋
              </button>
            </div>
          </div>
          {/* Scale */}
          <div>
            <label className="text-white/70 text-sm mb-1 block">缩放 ({editForm.scale.toFixed(1)}x)</label>
            <input type="range" min={0.5} max={2} step={0.1} value={editForm.scale}
              onChange={e => setEditForm(f => ({ ...f, scale: Number(e.target.value) }))}
              className="w-full accent-[#fb6400]" />
            <div className="flex justify-between text-white/30 text-xs mt-1">
              <span>0.5x</span>
              <span>2.0x</span>
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-white/10 flex gap-3">
          <button onClick={onSave} className="flex-1 py-2 bg-[#fb6400] hover:bg-[#e55a00] text-white rounded-xl font-medium transition-colors">
            保存
          </button>
          <button onClick={onDelete} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl font-medium transition-colors border border-red-500/30">
            删除
          </button>
          <button onClick={onClose}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl font-medium transition-colors border border-white/10">
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
