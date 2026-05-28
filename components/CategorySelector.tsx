'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CategoryItem, PRESET_ICONS, getCategories, addCategory, updateCategory, deleteCategory } from '@/lib/category-manager';

interface CategorySelectorProps {
  toolId: string;
  value: string;
  onChange: (value: string) => void;
  showManage?: boolean;
  manageOnly?: boolean;
  onCategoriesChange?: () => void;
}

export default function CategorySelector({ toolId, value, onChange, showManage = true, manageOnly = false, onCategoriesChange }: CategorySelectorProps) {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [showManager, setShowManager] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoryItem | null>(null);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('📦');
  const [showIconPicker, setShowIconPicker] = useState(false);

  useEffect(() => {
    loadCategories();
  }, [toolId]);

  async function loadCategories() {
    const cats = await getCategories(toolId);
    setCategories(cats);
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    const id = `custom-${Date.now()}`;
    await addCategory(toolId, { id, name: newName.trim(), icon: newIcon });
    setNewName('');
    setNewIcon('📦');
    await loadCategories();
    onCategoriesChange?.();
  }

  async function handleUpdate() {
    if (!editingCat || !newName.trim()) return;
    await updateCategory(toolId, { ...editingCat, name: newName.trim(), icon: newIcon });
    setEditingCat(null);
    setNewName('');
    setNewIcon('📦');
    await loadCategories();
    onCategoriesChange?.();
  }

  async function handleDelete(catId: string) {
    if (confirm('确定删除此分类？')) {
      await deleteCategory(toolId, catId);
      await loadCategories();
      onCategoriesChange?.();
    }
  }

  function startEdit(cat: CategoryItem) {
    setEditingCat(cat);
    setNewName(cat.name);
    setNewIcon(cat.icon);
  }

  return (
    <div>
      {/* 分类选择按钮 */}
      <div className="flex flex-wrap gap-2">
        {!manageOnly && categories.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(cat.name)}
            className={`px-3 py-2.5 rounded-lg text-sm transition-colors ${
              value === cat.name
                ? 'bg-[#fb6400] text-white'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
        {(showManage || manageOnly) && (
          <button
            type="button"
            onClick={() => setShowManager(true)}
            className="px-3 py-2.5 rounded-lg text-sm bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60 border border-dashed border-white/20"
          >
            管理分类
          </button>
        )}
      </div>

      {/* 分类管理弹窗 */}
      {showManager && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white font-bold">管理分类</h3>
              <button onClick={() => { setShowManager(false); setEditingCat(null); setNewName(''); }} className="w-10 h-10 flex items-center justify-center text-white/50 hover:text-white text-xl">×</button>
            </div>

            {/* 分类列表 */}
            <div className="p-4 space-y-2 max-h-[40vh] overflow-y-auto">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{cat.icon}</span>
                    <span className="text-white">{cat.name}</span>
                    {cat.isDefault && <span className="text-white/30 text-xs">(默认)</span>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(cat)} className="px-2 py-1 text-xs text-white/50 hover:text-white hover:bg-white/10 rounded">编辑</button>
                    {!cat.isDefault && (
                      <button onClick={() => handleDelete(cat.id)} className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded">删除</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 添加/编辑分类 */}
            <div className="p-4 border-t border-white/10">
              <h4 className="text-white/70 text-sm mb-2">{editingCat ? '编辑分类' : '添加新分类'}</h4>
              <div className="flex gap-2 mb-2">
                {/* 图标选择 */}
                <button
                  type="button"
                  onClick={() => setShowIconPicker(!showIconPicker)}
                  className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-xl hover:bg-white/20"
                >
                  {newIcon}
                </button>
                {/* 名称输入 */}
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="分类名称"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#fb6400]"
                />
                {/* 添加/更新按钮 */}
                <button
                  onClick={editingCat ? handleUpdate : handleAdd}
                  disabled={!newName.trim()}
                  className="px-4 py-2 bg-[#fb6400] hover:bg-[#e55a00] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {editingCat ? '更新' : '添加'}
                </button>
              </div>

              {/* 图标选择器 */}
              {showIconPicker && (
                <div className="bg-white/5 rounded-lg p-3 mb-2">
                  <div className="flex flex-wrap gap-2">
                    {PRESET_ICONS.map(icon => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => { setNewIcon(icon); setShowIconPicker(false); }}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl hover:bg-white/20 ${
                          newIcon === icon ? 'bg-[#fb6400]/30 ring-1 ring-[#fb6400]' : 'bg-white/5'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <label className="text-white/50 text-xs mb-1 block">或输入自定义表情：</label>
                    <input
                      type="text"
                      value={newIcon}
                      onChange={e => setNewIcon(e.target.value)}
                      maxLength={2}
                      className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-center text-xl"
                    />
                  </div>
                </div>
              )}

              {editingCat && (
                <button
                  onClick={() => { setEditingCat(null); setNewName(''); setNewIcon('📦'); }}
                  className="w-full py-2 text-white/50 text-sm hover:text-white"
                >
                  取消编辑
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
