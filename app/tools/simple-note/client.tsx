'use client';
import { useToolHistory } from '@/lib/useToolHistory';

import { useState, useEffect, useCallback, useRef } from 'react';
import BackButton from '@/components/BackButton';
import FullscreenButton from '@/components/FullscreenButton';
import {
  type DiaryEntry, type Mood, type PhotoRef,
  addEntry, updateEntry, deleteEntry,
  getEntriesByDate, getAllDatesWithEntries, getAllEntries,
  addPhoto, getPhoto, deletePhotosByEntryId,
  generateThumbnail,
  exportAllData, importAllData,
} from '@/lib/simple-note-db';

function genId(): string {
  try { return crypto.randomUUID(); } catch { /* fallback below */ }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
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
        {entry.mood && <span className="text-2xl shrink-0">{entry.mood}</span>}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white/40 text-xs">{formatTime(entry.updatedAt)}</span>
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
  filterDate,
}: {
  entries: DiaryEntry[];
  onEdit: (entry: DiaryEntry) => void;
  onNew: () => void;
  selectedDate: string;
  onPhotoClick: (photoId: string) => void;
  filterDate?: string | null;
}) {
  // 按日期分组
  const grouped = entries.reduce<Record<string, DiaryEntry[]>>((acc, entry) => {
    (acc[entry.date] ??= []).push(entry);
    return acc;
  }, {});

  // 排序日期：最新在上
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  // 如果有筛选日期，只显示该日期
  const datesToShow = filterDate ? [filterDate] : sortedDates;

  if (entries.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">📝</div>
        <p className="text-white/40 text-sm mb-4">{filterDate ? '这天还没有记录' : '还没有任何记录'}</p>
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
    <div className="space-y-6">
      {/* 新建按钮 */}
      <div className="flex items-center justify-between">
        <h2 className="text-white/60 text-sm font-medium">
          {filterDate ? formatDate(filterDate) : '全部日记'}
        </h2>
        <button
          onClick={onNew}
          className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white text-xs font-medium hover:scale-105 transition-all"
        >
          + 新建
        </button>
      </div>

      {/* 按日期分组显示 */}
      {datesToShow.map(date => {
        const dateEntries = grouped[date] || [];
        if (dateEntries.length === 0) return null;
        return (
          <div key={date} className="space-y-3">
            <h3 className="text-white/50 text-xs font-medium flex items-center gap-2">
              <span className="w-8 h-px bg-white/20" />
              {formatDate(date)}
              <span className="text-white/30">({dateEntries.length})</span>
            </h3>
            {dateEntries.map(entry => (
              <EntryCard key={entry.id} entry={entry} onEdit={onEdit} onPhotoClick={onPhotoClick} />
            ))}
          </div>
        );
      })}
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
              className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white text-xs flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
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
  const draftKey = `simple-note-draft-${entry?.id || 'new'}`;

  // 从草稿恢复
  const [date, setDate] = useState(() => {
    if (entry) return entry.date;
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey) || 'null');
      if (draft?.date) return draft.date;
    } catch {}
    return selectedDate;
  });
  const [mood, setMood] = useState<Mood>(() => {
    if (entry) return entry.mood || '😊';
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey) || 'null');
      if (draft?.mood) return draft.mood;
    } catch {}
    return '😊';
  });
  const [content, setContent] = useState(() => {
    if (entry) return entry.content || '';
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey) || 'null');
      if (draft?.content) return draft.content;
    } catch {}
    return '';
  });
  const [photos, setPhotos] = useState<{ id: string; thumbnail: string; blob?: Blob; width: number; height: number }[]>(
    entry?.photos.map(p => ({ ...p })) || []
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 检查是否有草稿（仅新建时提示）
  useEffect(() => {
    if (!entry) {
      try {
        const draft = JSON.parse(localStorage.getItem(draftKey) || 'null');
        if (draft?.content || draft?.mood) setHasDraft(true);
      } catch {}
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 自动保存草稿（防抖 1 秒）
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (content || mood !== '😊') {
        localStorage.setItem(draftKey, JSON.stringify({ date, mood, content }));
      }
    }, 1000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [date, mood, content, draftKey]);

  // 清除草稿
  const clearDraft = useCallback(() => {
    localStorage.removeItem(draftKey);
  }, [draftKey]);

  const handleAddPhotos = useCallback(async (files: FileList) => {
    const newPhotos = await Promise.all(
      Array.from(files).map(async (file) => {
        const result = await generateThumbnail(file);
        return { id: genId(), thumbnail: result.thumbnail, blob: result.blob, width: result.width, height: result.height };
      })
    );
    setPhotos(prev => [...prev, ...newPhotos]);
  }, []);

  const handleRemovePhoto = useCallback((id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  }, []);

  // 粘贴图片上传
  const editorRef = useRef<HTMLDivElement>(null);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length === 0) return;
    e.preventDefault();
    const fileList = new DataTransfer();
    imageFiles.forEach(f => fileList.items.add(f));
    handleAddPhotos(fileList.files);
  }, [handleAddPhotos]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    const now = Date.now();
    const diaryEntry: DiaryEntry = {
      id: entry?.id || genId(),
      date,
      content,
      mood,
      photos: photos.map(p => ({ id: p.id, thumbnail: p.thumbnail, width: p.width, height: p.height })),
      createdAt: entry?.createdAt || now,
      updatedAt: now,
    };
    clearDraft();
    onSave(diaryEntry, photos.filter(p => p.blob).map(p => ({
      id: p.id, thumbnail: p.thumbnail, blob: p.blob!, width: p.width, height: p.height,
    })));
  }, [date, content, mood, photos, entry, saving, onSave, clearDraft]);

  return (
    <div ref={editorRef} onPaste={handlePaste} className="fixed inset-0 z-50 flex flex-col bg-[#0a0a1a]">
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

      {hasDraft && (
        <div className="px-4 py-1.5 bg-[#fb6400]/10 border-b border-[#fb6400]/20 text-[#fb6400] text-xs text-center">
          已自动恢复上次未保存的草稿
        </div>
      )}

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
          <input
            type="text"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            placeholder="输入表情或颜文字，如 😊 (◕‿◕)"
            maxLength={20}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#fb6400] placeholder-white/20"
          />
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
          <p className="text-white/25 text-[10px] mt-1.5">💡 在输入框中可直接 Ctrl+V 粘贴图片</p>
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
  useToolHistory('simple-note');
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
  const [importing, setImporting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [filterDate, setFilterDate] = useState<string | null>(null);

  const loadDatesWithEntries = useCallback(async () => {
    const dates = await getAllDatesWithEntries();
    setDatesWithEntries(new Set(dates));
  }, []);

  const loadEntries = useCallback(async () => {
    if (filterDate) {
      const result = await getEntriesByDate(filterDate);
      setEntries(result);
    } else {
      const result = await getAllEntries();
      setEntries(result);
    }
  }, [filterDate]);

  useEffect(() => { loadDatesWithEntries(); }, [loadDatesWithEntries]);
  useEffect(() => { loadEntries(); }, [loadEntries]);

  // 浏览器返回键：编辑器打开时先关闭编辑器，不退出工具
  useEffect(() => {
    if (showEditor) {
      window.history.pushState({ editor: true }, '');
      const handlePopState = () => {
        setShowEditor(false);
        setEditingEntry(null);
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [showEditor]);

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
    localStorage.removeItem(`simple-note-draft-${id}`);
    await deletePhotosByEntryId(id);
    await deleteEntry(id);
    setShowEditor(false);
    setEditingEntry(null);
    await loadEntries();
    await loadDatesWithEntries();
  }, [loadEntries, loadDatesWithEntries]);

  const handleExport = useCallback(async () => {
    try {
      const data = await exportAllData();
      const blob = new Blob([data], { type: 'application/json' });
      const fileName = `简单记备份-${new Date().toISOString().slice(0, 10)}.json`;

      // 检测是否为移动设备
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      // 移动端优先使用分享功能
      if (isMobile && navigator.share) {
        const file = new File([blob], fileName, { type: 'application/json' });
        try {
          await navigator.share({
            title: '简单记数据备份',
            text: '我的简单记数据备份文件',
            files: [file],
          });
          return;
        } catch {
          // 用户取消分享，降级为下载
        }
      }

      // 降级：直接下载
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      if (isMobile) {
        alert('备份文件已保存到"下载"文件夹。\n\n建议：备份后将文件发送到微信或邮箱保存，避免丢失。');
      }
    } catch (err) {
      alert('导出失败：' + (err as Error).message);
    }
  }, []);

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const result = await importAllData(text);

      let message = '导入完成！\n';
      if (result.addedEntries > 0) {
        message += `✓ 新增 ${result.addedEntries} 条日记`;
        if (result.addedPhotos > 0) {
          message += `，${result.addedPhotos} 张照片`;
        }
        message += '\n';
      }
      if (result.skippedEntries > 0) {
        message += `⊘ 跳过 ${result.skippedEntries} 条重复记录\n`;
      }
      if (result.addedEntries === 0 && result.skippedEntries > 0) {
        message += '\n所有数据都已存在，无需导入。';
      }

      alert(message);
      await loadEntries();
      await loadDatesWithEntries();
    } catch (err) {
      alert('导入失败：' + (err as Error).message);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  }, [loadEntries, loadDatesWithEntries]);

  return (
    <div className="min-h-screen relative z-10">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl safe-area-top border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center">
          <BackButton category="life" />
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
          <FullscreenButton className="ml-auto" />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 pt-24 pb-16">
        <div className="flex gap-6">
          {/* Desktop calendar */}
          <div className="hidden md:block w-[280px] shrink-0 sticky top-24 self-start">
            <CalendarPanel
              selectedDate={filterDate || selectedDate}
              onSelectDate={(date) => setFilterDate(date === filterDate ? null : date)}
              calendarMonth={calendarMonth}
              onChangeMonth={setCalendarMonth}
              datesWithEntries={datesWithEntries}
            />
            {/* 备份/恢复按钮 */}
            <div className="mt-4 space-y-2">
              <button
                onClick={handleExport}
                className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm hover:bg-white/10 hover:border-[#fb6400]/30 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                备份数据
              </button>
              <label className={`w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm hover:bg-white/10 hover:border-[#fb6400]/30 transition-all flex items-center justify-center gap-2 cursor-pointer ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {importing ? '导入中...' : '恢复数据'}
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImport}
                  disabled={importing}
                />
              </label>
              <button
                onClick={() => setShowHelp(true)}
                className="w-full py-2 rounded-xl text-white/40 text-xs hover:text-white/60 transition-all flex items-center justify-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                使用帮助
              </button>
            </div>
          </div>
          {/* Entry list area */}
          <div className="flex-1 min-w-0">
            {filterDate && (
              <div className="mb-4 flex items-center gap-2">
                <button
                  onClick={() => setFilterDate(null)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 text-xs hover:bg-white/10 hover:text-white transition-all"
                >
                  ← 返回全部
                </button>
                <span className="text-white/40 text-xs">正在查看：{formatDate(filterDate)}</span>
              </div>
            )}
            <EntryList
              entries={entries}
              selectedDate={selectedDate}
              onEdit={(e) => { setEditingEntry(e); setShowEditor(true); }}
              onNew={() => { setEditingEntry(null); setShowEditor(true); }}
              onPhotoClick={(id) => setViewingPhoto(id)}
              filterDate={filterDate}
            />
          </div>
        </div>

        {/* Mobile calendar overlay */}
        {showMobileCalendar && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowMobileCalendar(false)} />
            <div className="absolute bottom-0 left-0 right-0 p-4 animate-slide-up">
              <CalendarPanel
                selectedDate={filterDate || selectedDate}
                onSelectDate={(d) => { setFilterDate(d === filterDate ? null : d); setShowMobileCalendar(false); }}
                calendarMonth={calendarMonth}
                onChangeMonth={setCalendarMonth}
                datesWithEntries={datesWithEntries}
              />
              {/* 移动端备份/恢复按钮 */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => { handleExport(); setShowMobileCalendar(false); }}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  备份
                </button>
                <label className={`flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  {importing ? '导入中...' : '恢复'}
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => { handleImport(e); setShowMobileCalendar(false); }}
                    disabled={importing}
                  />
                </label>
                <button
                  onClick={() => { setShowMobileCalendar(false); setShowHelp(true); }}
                  className="py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm hover:bg-white/10 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Mobile FAB */}
        <button
          onClick={() => { setEditingEntry(null); setShowEditor(true); }}
          className="md:hidden fixed z-30 w-14 h-14 rounded-full bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white text-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 hover:scale-110 active:scale-95 transition-all"
          style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))', right: 'calc(1.5rem + env(safe-area-inset-right, 0px))' }}
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

      {/* 帮助弹窗 */}
      {showHelp && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
          <div className="glass-card max-w-md w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-lg">数据备份与恢复</h2>
              <button onClick={() => setShowHelp(false)} className="text-white/40 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <h3 className="text-[#fb6400] font-medium mb-2">为什么要备份？</h3>
                <p className="text-white/60">数据保存在浏览器中，清除浏览器数据、换设备或换浏览器都会导致数据丢失。定期备份可以保护你的日记。</p>
              </div>

              <div>
                <h3 className="text-[#fb6400] font-medium mb-2">如何备份？</h3>
                <ol className="text-white/60 space-y-2 list-decimal pl-4">
                  <li>点击「备份数据」按钮</li>
                  <li>
                    <strong className="text-white/80">手机端：</strong>会弹出分享选项，可以选择发送到「微信」「邮件」或「保存到文件」
                  </li>
                  <li>
                    <strong className="text-white/80">电脑端：</strong>会自动下载一个 JSON 文件
                  </li>
                  <li>建议将备份文件保存到微信收藏、邮箱或云盘</li>
                </ol>
              </div>

              <div>
                <h3 className="text-[#fb6400] font-medium mb-2">如何恢复？</h3>
                <ol className="text-white/60 space-y-2 list-decimal pl-4">
                  <li>点击「恢复数据」按钮</li>
                  <li>选择之前备份的 JSON 文件</li>
                  <li>系统会自动合并数据：<br/>
                    <span className="text-white/40">- 新记录会添加进来</span><br/>
                    <span className="text-white/40">- 已存在的记录会跳过，不会重复</span>
                  </li>
                </ol>
              </div>

              <div>
                <h3 className="text-[#fb6400] font-medium mb-2">手机端找不到备份文件？</h3>
                <ul className="text-white/60 space-y-1 list-disc pl-4">
                  <li>备份时优先使用「分享」功能，直接发送到微信或邮箱</li>
                  <li>如果选择下载，文件保存在「文件管理 → 下载」文件夹</li>
                  <li>文件名格式：<code className="bg-white/10 px-1 rounded text-xs">简单记备份-日期.json</code></li>
                </ul>
              </div>

              <div className="pt-2 border-t border-white/10">
                <p className="text-white/40 text-xs">建议每周备份一次，或在重要记录后立即备份。</p>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="w-full mt-4 py-2.5 rounded-xl bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white text-sm font-medium hover:scale-105 transition-all"
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
