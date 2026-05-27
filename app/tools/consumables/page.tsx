'use client';
import { useToolHistory } from '@/lib/useToolHistory';
import { useState, useEffect, useMemo, useRef } from 'react';
import BackButton from '@/components/BackButton';
import CategorySelector from '@/components/CategorySelector';
import {
  Consumable, Category, CATEGORIES, CATEGORY_ICONS,
  genId, getAllItems, addItem, updateItem, deleteItem,
  exportAllData, importAllData, replaceAllData, calculateStats
} from '@/lib/consumables-db';
import { getCategories, getCategoryIcons, CategoryItem } from '@/lib/category-manager';

type SortField = 'name' | 'quantity' | 'price' | 'storageDate';
type SortDir = 'asc' | 'desc';

export default function ConsumablesPage() {
  useToolHistory('consumables');

  const [items, setItems] = useState<Consumable[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<Category | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('storageDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showEditor, setShowEditor] = useState(false);
  const [editingItem, setEditingItem] = useState<Consumable | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customCategories, setCustomCategories] = useState<CategoryItem[]>([]);
  const [categoryIcons, setCategoryIcons] = useState<Record<string, string>>(CATEGORY_ICONS);

  // 加载数据
  useEffect(() => {
    loadItems();
    loadCategories();
  }, []);

  async function loadCategories() {
    const cats = await getCategories('consumables');
    setCustomCategories(cats);
    const icons = await getCategoryIcons('consumables');
    setCategoryIcons(icons);
  }

  async function loadItems() {
    try {
      const data = await getAllItems();
      setItems(data);
    } catch (e) {
      console.error('加载失败:', e);
    } finally {
      setLoading(false);
    }
  }

  // 筛选排序后的列表
  const displayItems = useMemo(() => {
    let result = [...items];

    // 搜索
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(i =>
        i.name.toLowerCase().includes(q) ||
        (i.note && i.note.toLowerCase().includes(q))
      );
    }

    // 分类筛选
    if (filterCat !== 'all') {
      result = result.filter(i => i.category === filterCat);
    }

    // 排序
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'quantity': cmp = a.quantity - b.quantity; break;
        case 'price': cmp = a.price - b.price; break;
        case 'storageDate': cmp = a.storageDate.localeCompare(b.storageDate); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [items, search, filterCat, sortField, sortDir]);

  // 统计
  const stats = useMemo(() => calculateStats(items), [items]);

  // 保存（新增/编辑）
  async function handleSave(data: Omit<Consumable, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = Date.now();
    if (editingItem) {
      await updateItem({ ...editingItem, ...data, updatedAt: now });
      showToast('已更新');
    } else {
      await addItem({ ...data, id: genId(), createdAt: now, updatedAt: now });
      showToast('已添加');
    }
    setShowEditor(false);
    setEditingItem(null);
    await loadItems();
  }

  // 删除
  async function handleDelete(id: string) {
    await deleteItem(id);
    setShowDeleteConfirm(null);
    showToast('已删除');
    await loadItems();
  }

  // 导出
  async function handleExport() {
    const json = await exportAllData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `耗知通-备份-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    localStorage.setItem('consumables-last-backup', Date.now().toString());
    showToast('导出成功');
  }

  // 导入
  async function handleImport(mode: 'merge' | 'replace') {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let result: string;
      if (mode === 'merge') {
        const res = await importAllData(text);
        result = `导入完成：新增 ${res.added} 条，跳过 ${res.skipped} 条`;
      } else {
        const count = await replaceAllData(text);
        result = `替换完成：共 ${count} 条数据`;
      }
      showToast(result);
      setShowImportModal(false);
      await loadItems();
    } catch (e) {
      showToast('导入失败：文件格式错误');
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  function handleEdit(item: Consumable) {
    setEditingItem(item);
    setShowEditor(true);
  }

  // 备份提醒
  useEffect(() => {
    const last = localStorage.getItem('consumables-last-backup');
    if (last && Date.now() - parseInt(last) > 24 * 60 * 60 * 1000) {
      showToast('⚠️ 超过24小时未备份，建议导出数据');
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="text-white/50">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      {/* 顶部导航 */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-[#0a0a1a]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <BackButton toolId="consumables" />
          <div className="flex items-center gap-2">
            <span className="text-xl">📦</span>
            <span className="text-lg font-bold" style={{ color: '#fb6400' }}>耗知通</span>
          </div>
          <div className="flex-1" />
          <button onClick={() => setShowHelp(true)} className="text-white/50 hover:text-white text-sm">使用说明</button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-20 pb-24">
        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="glass-card rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-white">{stats.totalQuantity}</div>
            <div className="text-xs text-white/50">总数量</div>
          </div>
          <div className="glass-card rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-[#fb6400]">¥{stats.totalValue.toFixed(0)}</div>
            <div className="text-xs text-white/50">总价值</div>
          </div>
          <div className="glass-card rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-white">{items.length}</div>
            <div className="text-xs text-white/50">物品种类</div>
          </div>
        </div>

        {/* 操作栏 */}
        <div className="glass-card rounded-xl p-3 mb-4">
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={() => { setEditingItem(null); setShowEditor(true); }}
              className="px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ background: 'linear-gradient(135deg, #fb6400, #ff8c00)' }}
            >
              + 添加消耗品
            </button>
            <button onClick={handleExport} className="px-3 py-2 rounded-lg bg-white/10 text-white/80 text-sm hover:bg-white/20">
              导出备份
            </button>
            <button onClick={() => setShowImportModal(true)} className="px-3 py-2 rounded-lg bg-white/10 text-white/80 text-sm hover:bg-white/20">
              导入数据
            </button>
          </div>

          {/* 搜索 */}
          <input
            type="text"
            placeholder="搜索名称或备注..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#fb6400]"
          />

          {/* 分类筛选 */}
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => setFilterCat('all')}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${filterCat === 'all' ? 'bg-[#fb6400] text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
            >
              全部
            </button>
            {customCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilterCat(cat.name as Category)}
                className={`px-3 py-1 rounded-full text-xs transition-colors ${filterCat === cat.name ? 'bg-[#fb6400] text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>

          {/* 排序 */}
          <div className="flex items-center gap-2 mt-3 text-xs text-white/50">
            <span>排序：</span>
            {(['name', 'quantity', 'price', 'storageDate'] as SortField[]).map(f => (
              <button
                key={f}
                onClick={() => { if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortField(f); setSortDir('asc'); } }}
                className={`px-2 py-1 rounded ${sortField === f ? 'bg-white/20 text-white' : 'hover:bg-white/10'}`}
              >
                {{ name: '名称', quantity: '数量', price: '金额', storageDate: '日期' }[f]}
                {sortField === f && (sortDir === 'asc' ? ' ↑' : ' ↓')}
              </button>
            ))}
          </div>
        </div>

        {/* 列表 */}
        {displayItems.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center text-white/50">
            {items.length === 0 ? '还没有消耗品，点击"添加消耗品"开始记录' : '没有匹配的消耗品'}
          </div>
        ) : (
          <div className="space-y-2">
            {displayItems.map(item => (
              <div key={item.id} className="glass-card rounded-xl p-4 hover:border-[#fb6400]/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{categoryIcons[item.category] || '📦'}</span>
                      <span className="text-white font-medium truncate">{item.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">{item.category}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <span className="text-white/70">数量: <span className="text-white font-medium">{item.quantity}</span></span>
                      <span className="text-white/70">单价: <span className="text-[#fb6400]">¥{item.price.toFixed(2)}</span></span>
                      <span className="text-white/70">总值: <span className="text-white">¥{(item.quantity * item.price).toFixed(2)}</span></span>
                    </div>
                    <div className="text-xs text-white/40 mt-1">
                      存入: {item.storageDate}
                      {item.expiryDate && ` · 过期: ${item.expiryDate}`}
                      {item.note && ` · ${item.note}`}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button onClick={() => handleEdit(item)} className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white text-sm">编辑</button>
                    <button onClick={() => setShowDeleteConfirm(item.id)} className="p-2 rounded-lg hover:bg-red-500/20 text-white/50 hover:text-red-400 text-sm">删除</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 编辑器弹窗 */}
      {showEditor && (
        <ItemEditor
          item={editingItem}
          onSave={handleSave}
          onClose={() => { setShowEditor(false); setEditingItem(null); }}
        />
      )}

      {/* 删除确认 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowDeleteConfirm(null)}>
          <div className="glass-card rounded-2xl p-6 max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold mb-2">确认删除</h3>
            <p className="text-white/60 text-sm mb-4">删除后无法恢复，确定要删除吗？</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 rounded-lg bg-white/10 text-white/80 text-sm">取消</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm">删除</button>
            </div>
          </div>
        </div>
      )}

      {/* 导入弹窗 */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowImportModal(false)}>
          <div className="glass-card rounded-2xl p-6 max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold mb-2">导入数据</h3>
            <p className="text-white/60 text-sm mb-4">选择备份的 JSON 文件</p>
            <input ref={fileInputRef} type="file" accept=".json" className="mb-4 text-sm text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#fb6400] file:text-white file:text-sm" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowImportModal(false)} className="px-4 py-2 rounded-lg bg-white/10 text-white/80 text-sm">取消</button>
              <button onClick={() => handleImport('merge')} className="px-4 py-2 rounded-lg bg-[#fb6400] text-white text-sm">合并导入</button>
              <button onClick={() => handleImport('replace')} className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm">替换导入</button>
            </div>
          </div>
        </div>
      )}

      {/* 帮助弹窗 */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowHelp(false)}>
          <div className="glass-card rounded-2xl p-6 max-w-md mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold mb-4">使用说明</h3>
            <div className="text-white/70 text-sm space-y-3">
              <p><strong className="text-white">耗知通</strong>帮助你记录和管理消耗品，清楚知道库存情况。</p>
              <div>
                <p className="text-white mb-1">添加消耗品：</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>点击"添加消耗品"按钮</li>
                  <li>填写名称、数量、单价等信息</li>
                  <li>选择分类（日用/食品/电子/办公/清洁/其他）</li>
                  <li>可选填过期日期和备注</li>
                </ul>
              </div>
              <div>
                <p className="text-white mb-1">数据备份：</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>点击"导出备份"下载 JSON 文件</li>
                  <li>点击"导入数据"恢复备份</li>
                  <li>合并导入：只添加新条目，不覆盖已有数据</li>
                  <li>替换导入：清空现有数据，完全使用导入的数据</li>
                </ul>
              </div>
              <div>
                <p className="text-white mb-1">搜索和筛选：</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>在搜索框输入名称或备注关键词</li>
                  <li>点击分类标签筛选特定类型</li>
                  <li>点击排序按钮切换排序方式</li>
                </ul>
              </div>
            </div>
            <button onClick={() => setShowHelp(false)} className="mt-4 w-full px-4 py-2 rounded-lg bg-[#fb6400] text-white text-sm">知道了</button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-[#fb6400] text-white text-sm animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}

// 编辑器组件
function ItemEditor({ item, onSave, onClose }: {
  item: Consumable | null;
  onSave: (data: Omit<Consumable, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(item?.name || '');
  const [quantity, setQuantity] = useState(item?.quantity?.toString() || '1');
  const [price, setPrice] = useState(item?.price?.toString() || '0');
  const [category, setCategory] = useState<Category>(item?.category || '日用');
  const [storageDate, setStorageDate] = useState(item?.storageDate || new Date().toISOString().slice(0, 16));
  const [expiryDate, setExpiryDate] = useState(item?.expiryDate || '');
  const [note, setNote] = useState(item?.note || '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      quantity: parseInt(quantity) || 1,
      price: parseFloat(price) || 0,
      category,
      storageDate: storageDate.slice(0, 10), // 只保存日期部分
      expiryDate: expiryDate || undefined,
      note: note.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-[#1a1a2e] rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-white font-bold">{item ? '编辑消耗品' : '添加消耗品'}</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white text-xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* 名称 */}
          <div>
            <label className="block text-sm text-white/60 mb-1">名称 *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="如：洗衣液、A4纸"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#fb6400]"
              required
            />
          </div>

          {/* 数量和单价 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-white/60 mb-1">数量</label>
              <input
                type="number"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                min="0"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#fb6400]"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">单价（元）</label>
              <input
                type="number"
                value={price}
                onChange={e => setPrice(e.target.value)}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#fb6400]"
              />
            </div>
          </div>

          {/* 分类 */}
          <div>
            <label className="block text-sm text-white/60 mb-1">分类</label>
            <CategorySelector
              toolId="consumables"
              value={category}
              onChange={(cat) => setCategory(cat as Category)}
            />
          </div>

          {/* 日期 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-white/60 mb-1">存入日期</label>
              <input
                type="datetime-local"
                value={storageDate}
                onChange={e => setStorageDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#fb6400] [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">过期日期（可选）</label>
              <input
                type="date"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#fb6400] [color-scheme:dark]"
              />
            </div>
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-sm text-white/60 mb-1">备注（可选）</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="补充信息..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#fb6400] resize-none"
            />
          </div>

          {/* 按钮 */}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg bg-white/10 text-white/80 text-sm">取消</button>
            <button type="submit" className="flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-medium" style={{ background: 'linear-gradient(135deg, #fb6400, #ff8c00)' }}>
              {item ? '保存修改' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
