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

  const loadDatesWithEntries = useCallback(async () => {
    const dates = await getAllDatesWithEntries();
    setDatesWithEntries(new Set(dates));
  }, []);

  useEffect(() => { loadDatesWithEntries(); }, [loadDatesWithEntries]);

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
    </div>
  );
}
