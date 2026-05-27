// lib/consumables-db.ts

export type Category = '日用' | '食品' | '电子' | '办公' | '清洁' | '其他';

export const CATEGORIES: Category[] = ['日用', '食品', '电子', '办公', '清洁', '其他'];

export const CATEGORY_ICONS: Record<Category, string> = {
  '日用': '🧴',
  '食品': '🍚',
  '电子': '🔋',
  '办公': '📎',
  '清洁': '🧹',
  '其他': '📦',
};

export interface Consumable {
  id: string;
  name: string;
  quantity: number;
  price: number;
  category: Category;
  storageDate: string;   // YYYY-MM-DD
  expiryDate?: string;   // YYYY-MM-DD
  note?: string;
  createdAt: number;     // timestamp
  updatedAt: number;     // timestamp
}

const DB_NAME = 'consumables-db';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('items')) {
        const store = db.createObjectStore('items', { keyPath: 'id' });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('storageDate', 'storageDate', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txPromise<T>(mode: IDBTransactionMode, storeName: string, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const db = await openDB();
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// CRUD 操作

export async function getAllItems(): Promise<Consumable[]> {
  return txPromise('readonly', 'items', s => s.getAll());
}

export async function getItemById(id: string): Promise<Consumable | undefined> {
  return txPromise('readonly', 'items', s => s.get(id));
}

export async function addItem(item: Consumable): Promise<void> {
  await txPromise('readwrite', 'items', s => s.add(item));
}

export async function updateItem(item: Consumable): Promise<void> {
  await txPromise('readwrite', 'items', s => s.put(item));
}

export async function deleteItem(id: string): Promise<void> {
  await txPromise('readwrite', 'items', s => s.delete(id));
}

export async function getItemsByCategory(category: Category): Promise<Consumable[]> {
  return new Promise(async (resolve, reject) => {
    const db = await openDB();
    const tx = db.transaction('items', 'readonly');
    const idx = tx.objectStore('items').index('category');
    const req = idx.getAll(category);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

// 导出所有数据
export async function exportAllData(): Promise<string> {
  const items = await getAllItems();
  return JSON.stringify({
    version: 1,
    exportDate: new Date().toISOString(),
    items,
  }, null, 2);
}

// 导入数据（merge 模式：只添加新条目，相同 id 跳过）
export async function importAllData(jsonStr: string): Promise<{
  added: number;
  skipped: number;
}> {
  const data = JSON.parse(jsonStr);
  if (!data.version || !data.items) {
    throw new Error('无效的备份文件');
  }

  const existingIds = new Set((await getAllItems()).map(i => i.id));
  const newItems = data.items.filter((i: Consumable) => !existingIds.has(i.id));
  const skipped = data.items.length - newItems.length;

  for (const item of newItems) {
    await addItem(item);
  }

  return { added: newItems.length, skipped };
}

// 替换导入（清空现有数据，只保留导入的）
export async function replaceAllData(jsonStr: string): Promise<number> {
  const data = JSON.parse(jsonStr);
  if (!data.version || !data.items) {
    throw new Error('无效的备份文件');
  }

  const db = await openDB();

  // 清空现有数据
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('items', 'readwrite');
    tx.objectStore('items').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // 写入新数据
  if (data.items.length > 0) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      for (const item of data.items) {
        store.add(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  db.close();
  return data.items.length;
}

// 统计函数
export function calculateStats(items: Consumable[]) {
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalValue = items.reduce((sum, i) => sum + i.quantity * i.price, 0);
  const categoryCount = new Set(items.map(i => i.category)).size;
  const byCategory = CATEGORIES.map(cat => ({
    category: cat,
    count: items.filter(i => i.category === cat).length,
    quantity: items.filter(i => i.category === cat).reduce((s, i) => s + i.quantity, 0),
  }));
  return { totalQuantity, totalValue, categoryCount, byCategory };
}
