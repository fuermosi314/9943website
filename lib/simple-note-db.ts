// lib/simple-note-db.ts
export type Mood = string;

export interface PhotoRef {
  id: string;
  thumbnail: string;
  width: number;
  height: number;
}

export interface DiaryEntry {
  id: string;
  date: string;
  content: string;
  mood: Mood;
  photos: PhotoRef[];
  createdAt: number;
  updatedAt: number;
}

const DB_NAME = 'simple-note-db';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('entries')) {
        const store = db.createObjectStore('entries', { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
      }
      if (!db.objectStoreNames.contains('photos')) {
        const store = db.createObjectStore('photos', { keyPath: 'id' });
        store.createIndex('entryId', 'entryId', { unique: false });
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

export async function addEntry(entry: DiaryEntry): Promise<void> {
  await txPromise('readwrite', 'entries', s => s.add(entry));
}

export async function updateEntry(entry: DiaryEntry): Promise<void> {
  await txPromise('readwrite', 'entries', s => s.put(entry));
}

export async function deleteEntry(id: string): Promise<void> {
  await txPromise('readwrite', 'entries', s => s.delete(id));
}

export async function getEntriesByDate(date: string): Promise<DiaryEntry[]> {
  return new Promise(async (resolve, reject) => {
    const db = await openDB();
    const tx = db.transaction('entries', 'readonly');
    const idx = tx.objectStore('entries').index('date');
    const req = idx.getAll(date);
    req.onsuccess = () => resolve(req.result.sort((a, b) => b.createdAt - a.createdAt));
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function getAllEntries(): Promise<DiaryEntry[]> {
  return new Promise(async (resolve, reject) => {
    const db = await openDB();
    const tx = db.transaction('entries', 'readonly');
    const req = tx.objectStore('entries').getAll();
    req.onsuccess = () => resolve(req.result.sort((a, b) => b.createdAt - a.createdAt));
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function getAllDatesWithEntries(): Promise<string[]> {
  return new Promise(async (resolve, reject) => {
    const db = await openDB();
    const tx = db.transaction('entries', 'readonly');
    const idx = tx.objectStore('entries').index('date');
    const req = idx.getAllKeys();
    req.onsuccess = () => resolve(Array.from(new Set(req.result as string[])));
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export interface PhotoRecord {
  id: string;
  entryId: string;
  blob: Blob;
}

export async function addPhoto(photo: PhotoRecord): Promise<void> {
  await txPromise('readwrite', 'photos', s => s.add(photo));
}

export async function getPhoto(id: string): Promise<Blob | null> {
  return new Promise(async (resolve, reject) => {
    const db = await openDB();
    const tx = db.transaction('photos', 'readonly');
    const req = tx.objectStore('photos').get(id);
    req.onsuccess = () => resolve(req.result?.blob ?? null);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function deletePhotosByEntryId(entryId: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const db = await openDB();
    const tx = db.transaction('photos', 'readwrite');
    const idx = tx.objectStore('photos').index('entryId');
    const req = idx.openCursor(entryId);
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => { db.close(); resolve(); };
  });
}

// 导出所有数据（entries + photos）
export async function exportAllData(): Promise<string> {
  const db = await openDB();

  // 读取所有 entries
  const entries: DiaryEntry[] = await new Promise((resolve, reject) => {
    const tx = db.transaction('entries', 'readonly');
    const req = tx.objectStore('entries').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  // 读取所有 photos，将 Blob 转为 base64
  const photos: { id: string; entryId: string; base64: string }[] = await new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readonly');
    const req = tx.objectStore('photos').getAll();
    req.onsuccess = async () => {
      const results = req.result;
      const converted = await Promise.all(
        results.map(async (p: PhotoRecord) => {
          const base64 = await blobToBase64(p.blob);
          return { id: p.id, entryId: p.entryId, base64 };
        })
      );
      resolve(converted);
    };
    req.onerror = () => reject(req.error);
  });

  db.close();

  return JSON.stringify({
    version: 1,
    exportDate: new Date().toISOString(),
    entries,
    photos,
  }, null, 2);
}

// 合并导入数据（不覆盖，只添加新条目）
export async function importAllData(jsonStr: string): Promise<{
  addedEntries: number;
  addedPhotos: number;
  skippedEntries: number;
}> {
  const data = JSON.parse(jsonStr);
  if (!data.version || !data.entries) {
    throw new Error('无效的备份文件');
  }

  const db = await openDB();

  // 获取现有 entries 的 ID 集合
  const existingEntryIds: Set<string> = await new Promise((resolve, reject) => {
    const tx = db.transaction('entries', 'readonly');
    const req = tx.objectStore('entries').getAllKeys();
    req.onsuccess = () => resolve(new Set(req.result as string[]));
    req.onerror = () => reject(req.error);
  });

  // 获取现有 photos 的 ID 集合
  const existingPhotoIds: Set<string> = await new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readonly');
    const req = tx.objectStore('photos').getAllKeys();
    req.onsuccess = () => resolve(new Set(req.result as string[]));
    req.onerror = () => reject(req.error);
  });

  // 筛选需要添加的 entries
  const newEntries = data.entries.filter((e: DiaryEntry) => !existingEntryIds.has(e.id));
  const skippedEntries = data.entries.length - newEntries.length;

  // 添加新 entries
  if (newEntries.length > 0) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('entries', 'readwrite');
      const store = tx.objectStore('entries');
      for (const entry of newEntries) {
        store.add(entry);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // 筛选并添加新 photos
  let addedPhotos = 0;
  const newPhotos = (data.photos || []).filter((p: { id: string }) => !existingPhotoIds.has(p.id));
  if (newPhotos.length > 0) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('photos', 'readwrite');
      const store = tx.objectStore('photos');
      for (const photo of newPhotos) {
        const blob = base64ToBlob(photo.base64);
        store.add({ id: photo.id, entryId: photo.entryId, blob });
        addedPhotos++;
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  db.close();

  return { addedEntries: newEntries.length, addedPhotos, skippedEntries };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string): Blob {
  const [header, data] = base64.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(data);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

export async function generateThumbnail(
  file: File,
  maxWidth = 200
): Promise<{ thumbnail: string; blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(maxWidth / bitmap.width, 1);
  const w = Math.round(bitmap.width * ratio);
  const h = Math.round(bitmap.height * ratio);

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, w, h);

  const blob = await canvas.convertToBlob({ type: file.type || 'image/jpeg' });

  const displayCanvas = document.createElement('canvas');
  displayCanvas.width = w;
  displayCanvas.height = h;
  displayCanvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
  const thumbnail = displayCanvas.toDataURL('image/jpeg', 0.7);

  return { thumbnail, blob, width: w, height: h };
}
