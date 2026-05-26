// lib/simple-note-db.ts
export type Mood = 'happy' | 'normal' | 'sad' | 'angry' | 'excited';

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
