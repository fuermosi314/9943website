# 简单记 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight diary tool with calendar view, photo support, and IndexedDB persistence.

**Architecture:** Single page component with sub-components, IndexedDB via a separate lib file, responsive layout with desktop sidebar and mobile bottom-sheet calendar.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, IndexedDB (native API)

---

## File Structure

| File | Responsibility |
|------|---------------|
| `lib/simple-note-db.ts` | IndexedDB CRUD operations, thumbnail generation |
| `app/tools/simple-note/page.tsx` | Main page + all sub-components |
| `lib/tools.ts` | Register new tool (modify existing) |

---

### Task 1: Register Tool in tools.ts

**Files:**
- Modify: `lib/tools.ts`

- [ ] **Step 1: Add tool definition to life category**

Find the `life` category tools array in `lib/tools.ts` and add:

```ts
{
  id: 'simple-note',
  name: '简单记',
  description: '简单好用的日记工具，记录每天的心情和故事',
  icon: '📝',
  category: 'life',
  path: '/tools/simple-note',
  tags: ['日记', '笔记', '记录', '心情', '照片'],
  keywords: ['日记', '笔记', '记事', '心情', '简单记'],
},
```

- [ ] **Step 2: Verify build passes**

Run: `cd /home/huang/claude/vs/work/9943小工具大全 && npm run build 2>&1 | tail -5`
Expected: Build succeeds, `/tools/simple-note` appears in output

- [ ] **Step 3: Commit**

```bash
git add lib/tools.ts
git commit -m "feat(simple-note): register tool in life category"
```

---

### Task 2: Create IndexedDB Wrapper

**Files:**
- Create: `lib/simple-note-db.ts`

- [ ] **Step 1: Write types and DB initialization**

```ts
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
```

- [ ] **Step 2: Write Entry CRUD functions**

Append to `lib/simple-note-db.ts`:

```ts
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
    req.onsuccess = () => resolve([...new Set(req.result as string[])]);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}
```

- [ ] **Step 3: Write Photo CRUD and thumbnail generation**

Append to `lib/simple-note-db.ts`:

```ts
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
```

- [ ] **Step 4: Verify build passes**

Run: `cd /home/huang/claude/vs/work/9943小工具大全 && npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add lib/simple-note-db.ts
git commit -m "feat(simple-note): add IndexedDB wrapper with entry/photo CRUD"
```

---

### Task 3: Create Main Page Shell with Header

**Files:**
- Create: `app/tools/simple-note/page.tsx`

- [ ] **Step 1: Write page shell with header and placeholder**

```tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import BackButton from '@/components/BackButton';
import {
  type DiaryEntry, type Mood, type PhotoRef,
  addEntry, updateEntry, deleteEntry,
  getEntriesByDate, getAllDatesWithEntries,
  addPhoto, getPhoto, deletePhotosByEntryId,
  generateThumbnail,
} from '@/lib/simple-note-db';

const MOODS: { value: Mood; emoji: string; color: string; label: string }[] = [
  { value: 'happy', emoji: '😊', color: '#FFD93D', label: '开心' },
  { value: 'excited', emoji: '🤩', color: '#FF6B6B', label: '兴奋' },
  { value: 'normal', emoji: '😐', color: '#A0A0A0', label: '普通' },
  { value: 'sad', emoji: '😢', color: '#74B9FF', label: '难过' },
  { value: 'angry', emoji: '😠', color: '#E17055', label: '生气' },
];

function getMoodInfo(mood: Mood) {
  return MOODS.find(m => m.value === mood) || MOODS[2];
}

function formatDate(date: string) {
  const d = new Date(date);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

export default function SimpleNotePage() {
  return (
    <div className="min-h-screen relative z-10">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center">
          <BackButton toolId="simple-note" />
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="9943" className="w-8 h-8 rounded-lg shadow-lg shadow-orange-500/30" />
            <h1 className="text-lg font-semibold text-white">简单记</h1>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 pt-24 pb-16">
        <p className="text-white/40 text-sm">日记功能开发中...</p>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

Run: `cd /home/huang/claude/vs/work/9943小工具大全 && npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add app/tools/simple-note/page.tsx
git commit -m "feat(simple-note): create page shell with header"
```

---

### Task 4: Build CalendarPanel Component

**Files:**
- Modify: `app/tools/simple-note/page.tsx`

- [ ] **Step 1: Add CalendarPanel as inner component and state**

Add these state variables and the CalendarPanel component inside `SimpleNotePage`:

```tsx
// Add inside SimpleNotePage component:
const [selectedDate, setSelectedDate] = useState(() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
});
const [calendarMonth, setCalendarMonth] = useState(() => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
});
const [datesWithEntries, setDatesWithEntries] = useState<Set<string>>(new Set());
const [showMobileCalendar, setShowMobileCalendar] = useState(false);

const loadDatesWithEntries = useCallback(async () => {
  const dates = await getAllDatesWithEntries();
  setDatesWithEntries(new Set(dates));
}, []);

useEffect(() => { loadDatesWithEntries(); }, [loadDatesWithEntries]);

// CalendarPanel component (add before SimpleNotePage export):
function CalendarPanel({
  selectedDate,
  onSelectDate,
  calendarMonth,
  onChangeMonth,
  datesWithEntries,
  className = '',
}: {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  calendarMonth: { year: number; month: number };
  onChangeMonth: (ym: { year: number; month: number }) => void;
  datesWithEntries: Set<string>;
  className?: string;
}) {
  const { year, month } = calendarMonth;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const toStr = (d: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  return (
    <div className={`bg-white/5 rounded-2xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => onChangeMonth({ year: month === 0 ? year - 1 : year, month: month === 0 ? 11 : month - 1 })}
          className="text-white/60 hover:text-white p-1"
        >◀</button>
        <span className="text-white font-medium text-sm">{year}年{month + 1}月</span>
        <button
          onClick={() => onChangeMonth({ year: month === 11 ? year + 1 : year, month: month === 11 ? 0 : month + 1 })}
          className="text-white/60 hover:text-white p-1"
        >▶</button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {weekDays.map(d => (
          <div key={d} className="text-white/30 text-xs py-1">{d}</div>
        ))}
        {days.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const dateStr = toStr(d);
          const isSelected = dateStr === selectedDate;
          const hasEntry = datesWithEntries.has(dateStr);
          const isToday = dateStr === new Date().toISOString().slice(0, 10);
          return (
            <button
              key={d}
              onClick={() => onSelectDate(dateStr)}
              className={`relative py-1.5 rounded-lg text-sm transition-all ${
                isSelected
                  ? 'bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white font-bold'
                  : isToday
                    ? 'text-[#fb6400] font-bold'
                    : 'text-white/70 hover:bg-white/10'
              }`}
            >
              {d}
              {hasEntry && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#fb6400]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace placeholder in main with layout structure**

Replace the `<main>` content with:

```tsx
<main className="max-w-7xl mx-auto px-6 pt-24 pb-16">
  <div className="flex gap-6">
    {/* Desktop calendar */}
    <div className="hidden md:block w-[280px] shrink-0 sticky top-24 self-start">
      <CalendarPanel
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        calendarMonth={calendarMonth}
        onChangeMonth={setCalendarMonth}
        datesWithEntries={datesWithEntries}
      />
    </div>
    {/* Entry list area */}
    <div className="flex-1 min-w-0">
      <p className="text-white/40 text-sm">日记列表开发中...</p>
    </div>
  </div>

  {/* Mobile calendar overlay */}
  {showMobileCalendar && (
    <div className="fixed inset-0 z-40 md:hidden">
      <div className="absolute inset-0 bg-black/60" onClick={() => setShowMobileCalendar(false)} />
      <div className="absolute bottom-0 left-0 right-0 p-4 animate-slide-up">
        <CalendarPanel
          selectedDate={selectedDate}
          onSelectDate={(d) => { setSelectedDate(d); setShowMobileCalendar(false); }}
          calendarMonth={calendarMonth}
          onChangeMonth={setCalendarMonth}
          datesWithEntries={datesWithEntries}
        />
      </div>
    </div>
  )}
</main>
```

Also add a mobile calendar toggle button in the header, after the title:

```tsx
<button
  onClick={() => setShowMobileCalendar(true)}
  className="md:hidden ml-auto text-white/60 hover:text-white p-2"
>
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2" />
    <path strokeWidth="2" d="M16 2v4M8 2v4M3 10h18" />
  </svg>
</button>
```

- [ ] **Step 3: Verify build passes**

Run: `cd /home/huang/claude/vs/work/9943小工具大全 && npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add app/tools/simple-note/page.tsx
git commit -m "feat(simple-note): add calendar panel with month navigation"
```

---

### Task 5: Build EntryList and EntryCard

**Files:**
- Modify: `app/tools/simple-note/page.tsx`

- [ ] **Step 1: Add EntryList and EntryCard components**

Add these components inside `SimpleNotePage`:

```tsx
function EntryCard({
  entry,
  onEdit,
}: {
  entry: DiaryEntry;
  onEdit: (entry: DiaryEntry) => void;
}) {
  const moodInfo = getMoodInfo(entry.mood);
  const summary = entry.content.length > 60
    ? entry.content.slice(0, 60) + '...'
    : entry.content || '(无内容)';
  const displayPhotos = entry.photos.slice(0, 3);
  const extraCount = entry.photos.length - 3;

  return (
    <button
      onClick={() => onEdit(entry)}
      className="w-full text-left glass-card p-4 hover:border-[rgba(251,100,0,0.3)] transition-all"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">{moodInfo.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white/40 text-xs">{formatTime(entry.updatedAt)}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: moodInfo.color + '22', color: moodInfo.color }}>
              {moodInfo.label}
            </span>
          </div>
          <p className="text-white/80 text-sm leading-relaxed">{summary}</p>
          {entry.photos.length > 0 && (
            <div className="flex gap-1.5 mt-2">
              {displayPhotos.map(p => (
                <div key={p.id} className="w-14 h-14 rounded-lg overflow-hidden bg-white/5">
                  <img src={p.thumbnail} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              {extraCount > 0 && (
                <div className="w-14 h-14 rounded-lg bg-white/10 flex items-center justify-center text-white/50 text-xs">
                  +{extraCount}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function EntryList({
  entries,
  onEdit,
  onNew,
  selectedDate,
}: {
  entries: DiaryEntry[];
  onEdit: (entry: DiaryEntry) => void;
  onNew: () => void;
  selectedDate: string;
}) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">📝</div>
        <p className="text-white/40 text-sm mb-4">这天还没有记录</p>
        <button
          onClick={onNew}
          className="px-5 py-2 rounded-full bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white text-sm font-medium hover:scale-105 transition-all"
        >
          + 新建日记
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-white/60 text-sm font-medium">{formatDate(selectedDate)}</h2>
        <button
          onClick={onNew}
          className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white text-xs font-medium hover:scale-105 transition-all"
        >
          + 新建
        </button>
      </div>
      {entries.map(entry => (
        <EntryCard key={entry.id} entry={entry} onEdit={onEdit} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Add state and load entries, wire up in main layout**

Add these state and effects inside `SimpleNotePage`:

```tsx
const [entries, setEntries] = useState<DiaryEntry[]>([]);
const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
const [showEditor, setShowEditor] = useState(false);

const loadEntries = useCallback(async () => {
  const result = await getEntriesByDate(selectedDate);
  setEntries(result);
}, [selectedDate]);

useEffect(() => { loadEntries(); }, [loadEntries]);
```

Replace the entry list placeholder in `<main>`:

```tsx
{/* Entry list area */}
<div className="flex-1 min-w-0">
  <EntryList
    entries={entries}
    selectedDate={selectedDate}
    onEdit={(e) => { setEditingEntry(e); setShowEditor(true); }}
    onNew={() => { setEditingEntry(null); setShowEditor(true); }}
  />
</div>
```

- [ ] **Step 3: Verify build passes**

Run: `cd /home/huang/claude/vs/work/9943小工具大全 && npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add app/tools/simple-note/page.tsx
git commit -m "feat(simple-note): add entry list with cards and empty state"
```

---

### Task 6: Build MoodPicker and PhotoGrid

**Files:**
- Modify: `app/tools/simple-note/page.tsx`

- [ ] **Step 1: Add MoodPicker component**

```tsx
function MoodPicker({
  value,
  onChange,
}: {
  value: Mood;
  onChange: (mood: Mood) => void;
}) {
  return (
    <div className="flex gap-2">
      {MOODS.map(m => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all ${
            value === m.value
              ? 'scale-110 ring-2'
              : 'opacity-50 hover:opacity-80'
          }`}
          style={value === m.value ? { ringColor: m.color } : undefined}
          title={m.label}
        >
          {m.emoji}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Add PhotoGrid component**

```tsx
function PhotoGrid({
  photos,
  onAdd,
  onRemove,
}: {
  photos: { id: string; thumbnail: string; file?: File }[];
  onAdd: (files: FileList) => void;
  onRemove: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {photos.map(p => (
          <div key={p.id} className="relative w-20 h-20 rounded-lg overflow-hidden group">
            <img src={p.thumbnail} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => onRemove(p.id)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={() => inputRef.current?.click()}
          className="w-20 h-20 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center text-white/30 hover:border-[#fb6400] hover:text-[#fb6400] transition-all text-2xl"
        >
          +
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files) onAdd(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify build passes**

Run: `cd /home/huang/claude/vs/work/9943小工具大全 && npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add app/tools/simple-note/page.tsx
git commit -m "feat(simple-note): add mood picker and photo grid components"
```

---

### Task 7: Build EntryEditor

**Files:**
- Modify: `app/tools/simple-note/page.tsx`

- [ ] **Step 1: Add EntryEditor component**

```tsx
function EntryEditor({
  entry,
  selectedDate,
  onSave,
  onDelete,
  onClose,
}: {
  entry: DiaryEntry | null;
  selectedDate: string;
  onSave: (entry: DiaryEntry, photos: { id: string; thumbnail: string; blob: Blob; width: number; height: number }[]) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [date, setDate] = useState(entry?.date || selectedDate);
  const [mood, setMood] = useState<Mood>(entry?.mood || 'normal');
  const [content, setContent] = useState(entry?.content || '');
  const [photos, setPhotos] = useState<{ id: string; thumbnail: string; blob?: Blob; width: number; height: number }[]>(
    entry?.photos.map(p => ({ ...p })) || []
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAddPhotos = useCallback(async (files: FileList) => {
    const newPhotos = await Promise.all(
      Array.from(files).map(async (file) => {
        const result = await generateThumbnail(file);
        return { id: crypto.randomUUID(), thumbnail: result.thumbnail, blob: result.blob, width: result.width, height: result.height };
      })
    );
    setPhotos(prev => [...prev, ...newPhotos]);
  }, []);

  const handleRemovePhoto = useCallback((id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    const now = Date.now();
    const diaryEntry: DiaryEntry = {
      id: entry?.id || crypto.randomUUID(),
      date,
      content,
      mood,
      photos: photos.map(p => ({ id: p.id, thumbnail: p.thumbnail, width: p.width, height: p.height })),
      createdAt: entry?.createdAt || now,
      updatedAt: now,
    };
    onSave(diaryEntry, photos.filter(p => p.blob).map(p => ({
      id: p.id, thumbnail: p.thumbnail, blob: p.blob!, width: p.width, height: p.height,
    })));
  }, [date, content, mood, photos, entry, saving, onSave]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a1a]">
      {/* Editor header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <button onClick={onClose} className="text-white/60 hover:text-white text-sm">取消</button>
        <span className="text-white text-sm font-medium">{entry ? '编辑日记' : '新建日记'}</span>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-[#fb6400] hover:text-[#ff8c00] text-sm font-bold disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>

      {/* Editor body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Date */}
        <div>
          <label className="text-white/40 text-xs mb-1 block">日期</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#fb6400]"
          />
        </div>

        {/* Mood */}
        <div>
          <label className="text-white/40 text-xs mb-1 block">心情</label>
          <MoodPicker value={mood} onChange={setMood} />
        </div>

        {/* Content */}
        <div>
          <label className="text-white/40 text-xs mb-1 block">内容</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="今天发生了什么..."
            className="w-full h-40 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-[#fb6400] placeholder-white/20"
          />
        </div>

        {/* Photos */}
        <div>
          <label className="text-white/40 text-xs mb-1 block">照片</label>
          <PhotoGrid photos={photos} onAdd={handleAddPhotos} onRemove={handleRemovePhoto} />
        </div>
      </div>

      {/* Delete button (edit mode only) */}
      {entry && (
        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-2.5 rounded-lg border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-all"
          >
            删除日记
          </button>
        </div>
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60">
          <div className="glass-card p-6 mx-4 max-w-sm w-full">
            <p className="text-white text-sm mb-4">确定要删除这条日记吗？</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 rounded-lg bg-white/10 text-white/60 text-sm hover:bg-white/20"
              >
                取消
              </button>
              <button
                onClick={() => { onDelete(entry!.id); setShowDeleteConfirm(false); }}
                className="flex-1 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire up editor state and handlers in SimpleNotePage**

Add these handlers inside `SimpleNotePage`:

```tsx
const handleSaveEntry = useCallback(async (
  entry: DiaryEntry,
  photosToAdd: { id: string; thumbnail: string; blob: Blob; width: number; height: number }[],
) => {
  // Delete old photos if editing
  if (editingEntry) {
    await deletePhotosByEntryId(editingEntry.id);
  }
  // Save new photos
  for (const p of photosToAdd) {
    await addPhoto({ id: p.id, entryId: entry.id, blob: p.blob });
  }
  // Save entry
  if (editingEntry) {
    await updateEntry(entry);
  } else {
    await addEntry(entry);
  }
  setShowEditor(false);
  setEditingEntry(null);
  await loadEntries();
  await loadDatesWithEntries();
}, [editingEntry, loadEntries, loadDatesWithEntries]);

const handleDeleteEntry = useCallback(async (id: string) => {
  await deletePhotosByEntryId(id);
  await deleteEntry(id);
  setShowEditor(false);
  setEditingEntry(null);
  await loadEntries();
  await loadDatesWithEntries();
}, [loadEntries, loadDatesWithEntries]);
```

Add the editor overlay at the end of the return (before closing `</div>`):

```tsx
{showEditor && (
  <EntryEditor
    entry={editingEntry}
    selectedDate={selectedDate}
    onSave={handleSaveEntry}
    onDelete={handleDeleteEntry}
    onClose={() => { setShowEditor(false); setEditingEntry(null); }}
  />
)}
```

- [ ] **Step 3: Verify build passes**

Run: `cd /home/huang/claude/vs/work/9943小工具大全 && npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add app/tools/simple-note/page.tsx
git commit -m "feat(simple-note): add entry editor with photo upload and delete"
```

---

### Task 8: Add Floating Action Button

**Files:**
- Modify: `app/tools/simple-note/page.tsx`

- [ ] **Step 1: Add mobile FAB to main layout**

Add before the closing `</main>`:

```tsx
{/* Mobile FAB */}
<button
  onClick={() => { setEditingEntry(null); setShowEditor(true); }}
  className="md:hidden fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white text-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 hover:scale-110 active:scale-95 transition-all"
>
  +
</button>
```

- [ ] **Step 2: Verify build passes**

Run: `cd /home/huang/claude/vs/work/9943小工具大全 && npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add app/tools/simple-note/page.tsx
git commit -m "feat(simple-note): add mobile floating action button"
```

---

### Task 9: Add Large Photo Viewer

**Files:**
- Modify: `app/tools/simple-note/page.tsx`

- [ ] **Step 1: Add PhotoViewer component**

```tsx
function PhotoViewer({
  photoId,
  onClose,
}: {
  photoId: string;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoke: string | null = null;
    (async () => {
      const blob = await getPhoto(photoId);
      if (blob) {
        const u = URL.createObjectURL(blob);
        revoke = u;
        setUrl(u);
      }
    })();
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [photoId]);

  if (!url) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80" onClick={onClose}>
      <img src={url} alt="" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
      >
        ×
      </button>
    </div>
  );
}
```

Add state and render in `SimpleNotePage`:

```tsx
const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
```

Add viewer overlay after the editor:

```tsx
{viewingPhoto && (
  <PhotoViewer photoId={viewingPhoto} onClose={() => setViewingPhoto(null)} />
)}
```

Update `EntryCard` to accept `onPhotoClick` prop and call it when thumbnail is clicked:

Add to `EntryCard` props: `onPhotoClick: (photoId: string) => void`
In the thumbnail `<img>` onClick: `onClick={() => onPhotoClick(p.id)}`

Update `EntryList` to pass through `onPhotoClick`.
Update `SimpleNotePage` to pass `onPhotoClick={(id) => setViewingPhoto(id)}` to `EntryList`.

- [ ] **Step 2: Verify build passes**

Run: `cd /home/huang/claude/vs/work/9943小工具大全 && npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add app/tools/simple-note/page.tsx
git commit -m "feat(simple-note): add full-size photo viewer"
```

---

### Task 10: Final Polish and PROJECT.md Update

**Files:**
- Modify: `PROJECT.md`

- [ ] **Step 1: Update PROJECT.md with new tool**

Add to the life tools description in section 4:

```markdown
| `life` | 生活工具 | 🎯 | BMI 计算器、单位换算、专业计算器、视频去水印、简单记 |
```

Add to the tools directory tree in section 3:

```
│       ├── simple-note/      # 简单记（日记工具）
```

Add a new section 7.7:

```markdown
### 7.7 简单记 (simple-note)
- 轻量级日记工具，按日期记录生活
- IndexedDB 双表存储（entries + photos），单设备持久保存
- 照片上传：Canvas 缩略图（200px）预览 + 原图 Blob 按需加载
- 5 种心情表情：开心/兴奋/普通/难过/生气
- 日历侧栏 + 列表布局，响应式（桌面端分栏，移动端切换）
- 全屏编辑器：日期、心情、文字、照片
- localStorage 键名：无（使用 IndexedDB）
```

- [ ] **Step 2: Verify build passes**

Run: `cd /home/huang/claude/vs/work/9943小工具大全 && npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add PROJECT.md
git commit -m "docs: update PROJECT.md with simple-note tool"
```
