// lib/tianjige-db.ts

export interface PhotoRef {
  id: string;
  thumbnail: string; // base64 data URL
  width: number;
  height: number;
}

export interface Item {
  id: string;
  name: string;
  category: string;   // 衣物/书籍/电子/食品/日用/其他
  quantity: number;
  note: string;
  storageDate: string; // YYYY-MM-DDTHH:mm 存放日期（精确到分钟）
  purchaseDate?: string; // YYYY-MM-DDTHH:mm 购买日期（可选）
  price: number;
  photos: PhotoRef[];
  createdAt: number;
  updatedAt: number;
}

export type FurnitureType =
  | 'wardrobe' | 'bookshelf' | 'shoe-cabinet' | 'nightstand'
  | 'drawer-cabinet' | 'desk' | 'dining-table' | 'coffee-table'
  | 'bed' | 'sofa' | 'tv-cabinet' | 'fridge'
  | 'washing-machine' | 'sink' | 'custom';

export interface Furniture {
  id: string;
  type: FurnitureType;
  name: string;
  color: string;        // hex color, empty = use default
  position: { x: number; z: number };
  rotation: number;     // 0 | 90 | 180 | 270
  scale: number;        // 0.5 ~ 2.0
  addedAt: number;
  items: Item[];
  customShape?: 'box' | 'cylinder' | 'l-shape';
  customW?: number;
  customH?: number;
  customD?: number;
}

export interface Scene {
  id: string;
  name: string;
  emoji: string;
  isCustom: boolean;
  sortOrder: number;
  thumbnail: string;
  furniture: Furniture[];
  roomSize: number; // 3 | 5 | 7
}

export interface PhotoRecord {
  id: string;
  itemId: string;
  blob: Blob;
}

const DB_NAME = 'tianjige-db';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('scenes')) {
        db.createObjectStore('scenes', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('photos')) {
        const store = db.createObjectStore('photos', { keyPath: 'id' });
        store.createIndex('itemId', 'itemId', { unique: false });
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

// ---- Scene CRUD ----

export async function getAllScenes(): Promise<Scene[]> {
  try {
    const scenes = await txPromise('readonly', 'scenes', s => s.getAll());
    return scenes.sort((a, b) => a.sortOrder - b.sortOrder);
  } catch (e) {
    console.error('Failed to get all scenes:', e);
    return [];
  }
}

export async function saveScene(scene: Scene): Promise<boolean> {
  try {
    await txPromise('readwrite', 'scenes', s => s.put(scene));
    return true;
  } catch (e) {
    console.error('Failed to save scene:', e);
    return false;
  }
}

export async function deleteScene(id: string): Promise<boolean> {
  try {
    await txPromise('readwrite', 'scenes', s => s.delete(id));
    return true;
  } catch (e) {
    console.error('Failed to delete scene:', e);
    return false;
  }
}

export async function saveAllScenes(scenes: Scene[]): Promise<boolean> {
  try {
    return new Promise(async (resolve, reject) => {
      const db = await openDB();
      const tx = db.transaction('scenes', 'readwrite');
      const store = tx.objectStore('scenes');
      store.clear();
      for (const scene of scenes) {
        store.put(scene);
      }
      tx.oncomplete = () => { db.close(); resolve(true); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch (e) {
    console.error('Failed to save all scenes:', e);
    return false;
  }
}

// ---- Photo CRUD ----

export async function addPhoto(photo: PhotoRecord): Promise<boolean> {
  try {
    await txPromise('readwrite', 'photos', s => s.add(photo));
    return true;
  } catch (e) {
    console.error('Failed to add photo:', e);
    return false;
  }
}

export async function getPhoto(id: string): Promise<Blob | null> {
  try {
    return new Promise(async (resolve, reject) => {
      const db = await openDB();
      const tx = db.transaction('photos', 'readonly');
      const req = tx.objectStore('photos').get(id);
      req.onsuccess = () => resolve(req.result?.blob ?? null);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch (e) {
    console.error('Failed to get photo:', e);
    return null;
  }
}

export async function deletePhotosByItemId(itemId: string): Promise<boolean> {
  try {
    return new Promise(async (resolve, reject) => {
      const db = await openDB();
      const tx = db.transaction('photos', 'readwrite');
      const idx = tx.objectStore('photos').index('itemId');
      const req = idx.openCursor(itemId);
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => { db.close(); resolve(true); };
    });
  } catch (e) {
    console.error('Failed to delete photos:', e);
    return false;
  }
}

// ---- Thumbnail ----

export async function generateThumbnail(
  file: File,
  maxWidth = 200
): Promise<{ thumbnail: string; blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(maxWidth / bitmap.width, 1);
  const w = Math.round(bitmap.width * ratio);
  const h = Math.round(bitmap.height * ratio);

  // 缩略图
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.7 });

  // 原图压缩（如果超过 800px 则压缩到 800px）
  const maxOriginal = 800;
  const origRatio = Math.min(maxOriginal / bitmap.width, 1);
  const ow = Math.round(bitmap.width * origRatio);
  const oh = Math.round(bitmap.height * origRatio);
  const origCanvas = new OffscreenCanvas(ow, oh);
  origCanvas.getContext('2d')!.drawImage(bitmap, 0, 0, ow, oh);
  const blob = await origCanvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 });

  // 显示用缩略图
  const displayCanvas = document.createElement('canvas');
  displayCanvas.width = w;
  displayCanvas.height = h;
  displayCanvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
  const thumbnail = displayCanvas.toDataURL('image/jpeg', 0.7);

  return { thumbnail, blob, width: w, height: h };
}

// ---- Import / Export ----

export async function exportData(): Promise<string> {
  try {
    const scenes = await getAllScenes();
    return JSON.stringify(scenes);
  } catch (e) {
    console.error('Failed to export data:', e);
    return '[]';
  }
}

export async function importData(json: string, mode: 'merge' | 'replace'): Promise<boolean> {
  try {
    const incoming: Scene[] = JSON.parse(json);
    if (mode === 'replace') {
      await saveAllScenes(incoming);
    } else {
      const existing = await getAllScenes();
      const map = new Map(existing.map(s => [s.id, s]));
      for (const scene of incoming) {
        map.set(scene.id, scene);
      }
      await saveAllScenes(Array.from(map.values()));
    }
    return true;
  } catch (e) {
    console.error('Failed to import data:', e);
    return false;
  }
}
