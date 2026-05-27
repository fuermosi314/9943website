// lib/category-manager.ts - 共享的分类管理库

export interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  isDefault?: boolean;
}

// 预设图标列表
export const PRESET_ICONS = [
  '🧴', '🍚', '🔋', '📎', '🧹', '📦', // 原有图标
  '🏠', '🛋️', '🚿', '🍳', '👕', '👖',
  '📚', '💻', '📱', '🎮', '🧸', '🎨',
  '🔧', '🔩', '💊', '🩹', '🍎', '🥫',
  '🧴', '🧽', '🪣', '🧺', '🗑️', '💡',
];

// 默认分类
export const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: 'daily', name: '日用', icon: '🧴', isDefault: true },
  { id: 'food', name: '食品', icon: '🍚', isDefault: true },
  { id: 'electronics', name: '电子', icon: '🔋', isDefault: true },
  { id: 'office', name: '办公', icon: '📎', isDefault: true },
  { id: 'cleaning', name: '清洁', icon: '🧹', isDefault: true },
  { id: 'other', name: '其他', icon: '📦', isDefault: true },
];

const DB_NAME = 'category-manager-db';
const DB_VERSION = 1;

function openDB(toolId: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(`${DB_NAME}-${toolId}`, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// 获取所有分类
export async function getCategories(toolId: string): Promise<CategoryItem[]> {
  const db = await openDB(toolId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction('categories', 'readonly');
    const req = tx.objectStore('categories').getAll();
    req.onsuccess = () => {
      const items = req.result;
      if (items.length === 0) {
        // 如果没有分类，初始化默认分类
        initDefaultCategories(toolId).then(() => resolve(DEFAULT_CATEGORIES));
      } else {
        resolve(items);
      }
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

// 初始化默认分类
async function initDefaultCategories(toolId: string): Promise<void> {
  const db = await openDB(toolId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction('categories', 'readwrite');
    const store = tx.objectStore('categories');
    for (const cat of DEFAULT_CATEGORIES) {
      store.add(cat);
    }
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

// 添加分类
export async function addCategory(toolId: string, category: CategoryItem): Promise<void> {
  const db = await openDB(toolId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction('categories', 'readwrite');
    tx.objectStore('categories').add(category);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

// 更新分类
export async function updateCategory(toolId: string, category: CategoryItem): Promise<void> {
  const db = await openDB(toolId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction('categories', 'readwrite');
    tx.objectStore('categories').put(category);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

// 删除分类
export async function deleteCategory(toolId: string, categoryId: string): Promise<void> {
  const db = await openDB(toolId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction('categories', 'readwrite');
    tx.objectStore('categories').delete(categoryId);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

// 获取分类名称列表（兼容旧代码）
export async function getCategoryNames(toolId: string): Promise<string[]> {
  const categories = await getCategories(toolId);
  return categories.map(c => c.name);
}

// 获取分类图标映射（兼容旧代码）
export async function getCategoryIcons(toolId: string): Promise<Record<string, string>> {
  const categories = await getCategories(toolId);
  const icons: Record<string, string> = {};
  for (const cat of categories) {
    icons[cat.name] = cat.icon;
  }
  return icons;
}
