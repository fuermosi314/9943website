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

function EntryCard({
  entry,
  onEdit,
  onPhotoClick,
}: {
  entry: DiaryEntry;
  onEdit: (entry: DiaryEntry) => void;
  onPhotoClick: (photoId: string) => void;
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
                  <img src={p.thumbnail} alt="" className="w-full h-full object-cover" onClick={(e) => { e.stopPropagation(); onPhotoClick(p.id); }} />
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
  onPhotoClick,
}: {
  entries: DiaryEntry[];
  onEdit: (entry: DiaryEntry) => void;
  onNew: () => void;
  selectedDate: string;
  onPhotoClick: (photoId: string) => void;
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
        <EntryCard key={entry.id} entry={entry} onEdit={onEdit} onPhotoClick={onPhotoClick} />
      ))}
    </div>
  );
}

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
          style={value === m.value ? { borderColor: m.color, boxShadow: `0 0 0 2px ${m.color}` } : undefined}
          title={m.label}
        >
          {m.emoji}
        </button>
      ))}
    </div>
  );
}

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

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="text-white/40 text-xs mb-1 block">日期</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#fb6400]"
          />
        </div>

        <div>
          <label className="text-white/40 text-xs mb-1 block">心情</label>
          <MoodPicker value={mood} onChange={setMood} />
        </div>

        <div>
          <label className="text-white/40 text-xs mb-1 block">内容</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="今天发生了什么..."
            className="w-full h-40 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-[#fb6400] placeholder-white/20"
          />
        </div>

        <div>
          <label className="text-white/40 text-xs mb-1 block">照片</label>
          <PhotoGrid photos={photos} onAdd={handleAddPhotos} onRemove={handleRemovePhoto} />
        </div>
      </div>

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80" onClick={onClose}>
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

export default function SimpleNotePage() {
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
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);

  const loadDatesWithEntries = useCallback(async () => {
    const dates = await getAllDatesWithEntries();
    setDatesWithEntries(new Set(dates));
  }, []);

  const loadEntries = useCallback(async () => {
    const result = await getEntriesByDate(selectedDate);
    setEntries(result);
  }, [selectedDate]);

  useEffect(() => { loadDatesWithEntries(); }, [loadDatesWithEntries]);
  useEffect(() => { loadEntries(); }, [loadEntries]);

  const handleSaveEntry = useCallback(async (
    entry: DiaryEntry,
    photosToAdd: { id: string; thumbnail: string; blob: Blob; width: number; height: number }[],
  ) => {
    if (editingEntry) {
      await deletePhotosByEntryId(editingEntry.id);
    }
    for (const p of photosToAdd) {
      await addPhoto({ id: p.id, entryId: entry.id, blob: p.blob });
    }
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

  return (
    <div className="min-h-screen relative z-10">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center">
          <BackButton toolId="simple-note" />
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="9943" className="w-8 h-8 rounded-lg shadow-lg shadow-orange-500/30" />
            <h1 className="text-lg font-semibold text-white">简单记</h1>
          </div>
          <button
            onClick={() => setShowMobileCalendar(true)}
            className="md:hidden ml-auto text-white/60 hover:text-white p-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2" />
              <path strokeWidth="2" d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </button>
        </div>
      </header>
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
            <EntryList
              entries={entries}
              selectedDate={selectedDate}
              onEdit={(e) => { setEditingEntry(e); setShowEditor(true); }}
              onNew={() => { setEditingEntry(null); setShowEditor(true); }}
              onPhotoClick={(id) => setViewingPhoto(id)}
            />
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
        {/* Mobile FAB */}
        <button
          onClick={() => { setEditingEntry(null); setShowEditor(true); }}
          className="md:hidden fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white text-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 hover:scale-110 active:scale-95 transition-all"
        >
          +
        </button>
      </main>
      {showEditor && (
        <EntryEditor
          entry={editingEntry}
          selectedDate={selectedDate}
          onSave={handleSaveEntry}
          onDelete={handleDeleteEntry}
          onClose={() => { setShowEditor(false); setEditingEntry(null); }}
        />
      )}
      {viewingPhoto && (
        <PhotoViewer photoId={viewingPhoto} onClose={() => setViewingPhoto(null)} />
      )}
    </div>
  );
}
