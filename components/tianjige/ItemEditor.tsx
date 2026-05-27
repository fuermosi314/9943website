'use client';

import { Item, PhotoRef } from '@/lib/tianjige-db';
import CategorySelector from '@/components/CategorySelector';

interface ItemForm {
  name: string;
  category: string;
  quantity: number;
  price: number;
  storageDate: string;
  purchaseDate: string;
  note: string;
  photos: PhotoRef[];
}

interface ItemEditorProps {
  show: boolean;
  editingItem: Item | null;
  itemForm: ItemForm;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  setItemForm: (fn: (prev: ItemForm) => ItemForm) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onPhotoUpload: (file: File) => void;
  onRemovePhoto: (photoId: string) => void;
}

export default function ItemEditor({
  show, editingItem, itemForm, onClose, onSave, onDelete,
  setItemForm, onPaste, onPhotoUpload, onRemovePhoto,
}: ItemEditorProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onPaste={onPaste}>
      <div className="bg-[#1a1a2e] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md mx-0 sm:mx-4 border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-white text-lg font-bold">{editingItem ? '编辑物品' : '添加物品'}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-red-500/50 text-white/70 hover:text-white text-lg transition-colors">&times;</button>
        </div>
        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="text-white/70 text-sm mb-1 block">名称</label>
            <input type="text" value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fb6400]" placeholder="物品名称" />
          </div>
          {/* Category */}
          <div>
            <label className="text-white/70 text-sm mb-1 block">分类</label>
            <CategorySelector
              toolId="tianjige"
              value={itemForm.category}
              onChange={(cat) => setItemForm(f => ({ ...f, category: cat }))}
            />
          </div>
          {/* Quantity + Price */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-white/70 text-sm mb-1 block">数量</label>
              <input type="number" min={1} value={itemForm.quantity} onChange={e => setItemForm(f => ({ ...f, quantity: Math.max(1, Number(e.target.value)) }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fb6400]" />
            </div>
            <div className="flex-1">
              <label className="text-white/70 text-sm mb-1 block">价格 (¥)</label>
              <input type="number" min={0} step={0.01} value={itemForm.price} onChange={e => setItemForm(f => ({ ...f, price: Math.max(0, Number(e.target.value)) }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fb6400]" />
            </div>
          </div>
          {/* Storage Date */}
          <div>
            <label className="text-white/70 text-sm mb-1 block">存放日期</label>
            <input type="datetime-local" value={itemForm.storageDate} onChange={e => setItemForm(f => ({ ...f, storageDate: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fb6400]" />
          </div>
          {/* Purchase Date (optional) */}
          <div>
            <label className="text-white/70 text-sm mb-1 block">购买日期 <span className="text-white/30">(可选)</span></label>
            <input type="datetime-local" value={itemForm.purchaseDate} onChange={e => setItemForm(f => ({ ...f, purchaseDate: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fb6400]" />
          </div>
          {/* Note */}
          <div>
            <label className="text-white/70 text-sm mb-1 block">备注</label>
            <textarea value={itemForm.note} onChange={e => setItemForm(f => ({ ...f, note: e.target.value }))} rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fb6400] resize-none" placeholder="备注信息..." />
          </div>
          {/* Photos */}
          <div>
            <label className="text-white/70 text-sm mb-1 block">照片</label>
            <p className="text-white/40 text-xs mb-2">电脑端可直接 Ctrl+V 粘贴图片，或点击下方按钮添加</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {itemForm.photos.map(photo => (
                <div key={photo.id} className="relative w-16 h-16 rounded-lg overflow-hidden group">
                  <img src={photo.thumbnail} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => onRemovePhoto(photo.id)}
                    className="absolute top-0 right-0 w-5 h-5 bg-red-500/80 text-white text-xs rounded-bl-lg flex items-center justify-center opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">&times;</button>
                </div>
              ))}
              <label className="w-16 h-16 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-[#fb6400]/50 transition-colors">
                <span className="text-xl">📷</span>
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) onPhotoUpload(file);
                  e.target.value = '';
                }} />
              </label>
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-white/10 flex gap-3">
          <button onClick={onSave} className="flex-1 py-2 bg-[#fb6400] hover:bg-[#e55a00] text-white rounded-xl font-medium transition-colors">
            保存
          </button>
          {editingItem && (
            <button onClick={onDelete} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl font-medium transition-colors border border-red-500/30">
              删除
            </button>
          )}
          <button onClick={onClose}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl font-medium transition-colors border border-white/10">
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
