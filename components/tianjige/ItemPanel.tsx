'use client';

import { useState, useMemo, useRef } from 'react';
import { Furniture, Item } from '@/lib/tianjige-db';
import { FURNITURE_DEFAULTS } from './FurnitureRenderer';

interface ItemPanelProps {
  show: boolean;
  selectedFurniture: Furniture | null;
  onClose: () => void;
  onOpenItemEditor: (item: Item | null) => void;
  onDeleteItems: (itemIds: string[]) => void;
  onDeleteConfirm: (count: number) => Promise<boolean>;
  onEditFurniture: (furniture: Furniture) => void;
  onMoveFurniture: (furniture: Furniture) => void;
  onDeleteFurniture: (furniture: Furniture) => void;
}

type SortBy = 'name' | 'price' | 'date' | 'quantity';

const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: 'name', label: '名称' },
  { key: 'price', label: '价格' },
  { key: 'quantity', label: '数量' },
  { key: 'date', label: '日期' },
];

export default function ItemPanel({ show, selectedFurniture, onClose, onOpenItemEditor, onDeleteItems, onDeleteConfirm, onEditFurniture, onMoveFurniture, onDeleteFurniture }: ItemPanelProps) {
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerMoved = useRef(false);

  const sortedItems = useMemo(() => {
    if (!selectedFurniture) return [];
    const items = [...selectedFurniture.items];
    switch (sortBy) {
      case 'name':
        return items.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
      case 'price':
        return items.sort((a, b) => b.price - a.price);
      case 'quantity':
        return items.sort((a, b) => b.quantity - a.quantity);
      case 'date':
        return items.sort((a, b) => b.createdAt - a.createdAt);
      default:
        return items;
    }
  }, [selectedFurniture, sortBy]);

  if (!show || !selectedFurniture) return null;

  const toggleSelect = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedItems.size === sortedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(sortedItems.map(i => i.id)));
    }
  };

  const deleteSelected = async () => {
    if (selectedItems.size === 0) return;
    if (!await onDeleteConfirm(selectedItems.size)) return;
    onDeleteItems(Array.from(selectedItems));
    setSelectedItems(new Set());
    setSelectMode(false);
  };

  const handleExportCSV = () => {
    if (!selectedFurniture) return;
    const headers = ['名称', '分类', '数量', '价格', '存放日期', '购买日期', '备注'];
    const rows = selectedFurniture.items.map(item => [
      item.name, item.category, String(item.quantity), String(item.price), item.storageDate, item.purchaseDate || '', item.note,
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedFurniture.name}-物品清单.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleItemPointerDown = (e: React.PointerEvent, itemId: string) => {
    pointerMoved.current = false;
    longPressTimer.current = setTimeout(() => {
      if (!pointerMoved.current) {
        setSelectMode(true);
        setSelectedItems(new Set([itemId]));
      }
      longPressTimer.current = null;
    }, 500);
  };

  const handleItemPointerMove = () => {
    pointerMoved.current = true;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleItemPointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <div className={`
      fixed z-[60] bg-[#0a0a1a]/95 backdrop-blur-md border-white/10 flex flex-col animate-slide-in-right
      bottom-0 left-0 right-0 max-h-[70vh] h-auto border-t rounded-t-2xl
      sm:top-14 sm:right-0 sm:left-auto sm:bottom-auto sm:w-80 sm:max-w-[85vw] sm:h-[calc(100vh-56px)] sm:border-l sm:rounded-none
    `}>
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-white font-bold">{FURNITURE_DEFAULTS[selectedFurniture.type].emoji} {selectedFurniture.name}</h2>
        <div className="flex items-center gap-1">
          <button onClick={() => onEditFurniture(selectedFurniture)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-[#fb6400]/30 text-white/70 hover:text-white text-sm transition-colors"
            title="编辑家具">✏️</button>
          <button onClick={() => { onMoveFurniture(selectedFurniture); onClose(); }}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-[#fb6400]/30 text-white/70 hover:text-white text-sm transition-colors"
            title="移动家具">↕️</button>
          <button onClick={() => onDeleteFurniture(selectedFurniture)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-red-500/50 text-white/70 hover:text-red-400 text-sm transition-colors"
            title="删除家具">🗑️</button>
          <button onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-red-500/50 text-white/70 hover:text-white text-lg transition-colors">&times;</button>
        </div>
      </div>

      {/* Toolbar: sort + batch actions */}
      <div className="px-4 py-2 border-b border-white/10 space-y-2">
        <div className="flex gap-1">
          {SORT_OPTIONS.map(opt => (
            <button key={opt.key} onClick={() => setSortBy(opt.key)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                sortBy === opt.key
                  ? 'bg-[#fb6400] text-white'
                  : 'text-white/40 hover:text-white hover:bg-white/10'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
        {sortedItems.length > 0 && (
          <div className="flex gap-2">
            {selectMode ? (
              <>
                <button onClick={selectAll}
                  className="px-2 py-1 text-xs text-white/70 hover:text-white hover:bg-white/10 rounded">
                  {selectedItems.size === sortedItems.length ? '取消全选' : '全选'}
                </button>
                <button onClick={deleteSelected} disabled={selectedItems.size === 0}
                  className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded disabled:opacity-30">
                  删除选中 ({selectedItems.size})
                </button>
                <button onClick={() => { setSelectMode(false); setSelectedItems(new Set()); }}
                  className="px-2 py-1 text-xs text-white/50 hover:text-white hover:bg-white/10 rounded ml-auto">
                  取消
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setSelectMode(true)}
                  className="px-2 py-1 text-xs text-white/50 hover:text-white hover:bg-white/10 rounded">
                  选择
                </button>
                <button onClick={handleExportCSV}
                  className="px-2 py-1 text-xs text-white/50 hover:text-white hover:bg-white/10 rounded">
                  导出CSV
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {sortedItems.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-8">还没有物品，点击下方添加</p>
        ) : (
          sortedItems.map(item => (
            <div key={item.id}
              className={`glass-card p-3 rounded-xl cursor-pointer hover:ring-1 hover:ring-[#fb6400]/50 transition-all ${
                selectMode && selectedItems.has(item.id) ? 'ring-1 ring-[#fb6400] bg-[#fb6400]/10' : ''
              }`}
              onClick={() => selectMode ? toggleSelect(item.id) : onOpenItemEditor(item)}
              onPointerDown={(e) => handleItemPointerDown(e, item.id)}
              onPointerMove={handleItemPointerMove}
              onPointerUp={handleItemPointerUp}
              onPointerLeave={handleItemPointerUp}
            >
              <div className="flex items-center gap-2">
                {selectMode && (
                  <input type="checkbox" checked={selectedItems.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    className="accent-[#fb6400] flex-shrink-0" />
                )}
                {item.photos.length > 0 && (
                  <img src={item.photos[0].thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-white font-medium">{item.name}</span>
                      <span className="text-white/50 text-sm ml-2">x{item.quantity}</span>
                    </div>
                    {item.price > 0 && <span className="text-[#fb6400] text-sm">¥{item.price}</span>}
                  </div>
                  {item.category && <span className="text-white/30 text-xs">{item.category}</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-4 border-t border-white/10">
        <button onClick={() => onOpenItemEditor(null)} className="w-full py-2 bg-[#fb6400] hover:bg-[#e55a00] text-white rounded-xl font-medium transition-colors">
          + 添加物品
        </button>
      </div>
    </div>
  );
}
