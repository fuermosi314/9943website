'use client';

import { useState, useRef, useEffect } from 'react';

interface DatePickerProps {
  value: string; // ISO string: "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm"
  onChange: (value: string) => void;
  showTime?: boolean;
  placeholder?: string;
  className?: string;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function parseValue(val: string): { year: number; month: number; day: number; hour: number; minute: number } {
  if (!val) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate(), hour: now.getHours(), minute: now.getMinutes() };
  }
  const parts = val.split('T');
  const datePart = parts[0];
  const timePart = parts[1] || '00:00';
  const [y, m, d] = datePart.split('-').map(Number);
  const [h, min] = timePart.split(':').map(Number);
  return { year: y, month: m - 1, day: d, hour: h || 0, minute: min || 0 };
}

function formatDisplay(val: string, showTime: boolean): string {
  if (!val) return '';
  const parts = val.split('T');
  const dateStr = parts[0].replace(/-/g, '/');
  if (showTime && parts[1]) {
    return `${dateStr} ${parts[1]}`;
  }
  return dateStr;
}

export default function DatePicker({ value, onChange, showTime = false, placeholder = '选择日期', className = '' }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const parsed = parseValue(value);
  const [viewYear, setViewYear] = useState(parsed.year);
  const [viewMonth, setViewMonth] = useState(parsed.month);
  const [selHour, setSelHour] = useState(parsed.hour);
  const [selMinute, setSelMinute] = useState(parsed.minute);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      const p = parseValue(value);
      setViewYear(p.year);
      setViewMonth(p.month);
      setSelHour(p.hour);
      setSelMinute(p.minute);
    }
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const today = new Date();
  const selected = parseValue(value);

  function selectDay(day: number) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (showTime) {
      onChange(`${dateStr}T${String(selHour).padStart(2, '0')}:${String(selMinute).padStart(2, '0')}`);
    } else {
      onChange(dateStr);
    }
    if (!showTime) setOpen(false);
  }

  function confirmTime() {
    const dateStr = value ? value.split('T')[0] : `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(selected.day || today.getDate()).padStart(2, '0')}`;
    onChange(`${dateStr}T${String(selHour).padStart(2, '0')}:${String(selMinute).padStart(2, '0')}`);
    setOpen(false);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const displayText = value ? formatDisplay(value, showTime) : '';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-left text-sm focus:outline-none focus:border-[#fb6400] transition-colors ${className}`}
      >
        {displayText ? (
          <span className="text-white">{displayText}</span>
        ) : (
          <span className="text-white/30">{placeholder}</span>
        )}
      </button>

      {open && (
        <div ref={panelRef} className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-xs mx-0 sm:mx-4 border border-white/10 shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <button type="button" onClick={prevMonth} className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <span className="text-white font-medium">{viewYear}年{viewMonth + 1}月</span>
              <button type="button" onClick={nextMonth} className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            {/* Weekday headers */}
            <div className="px-4 pt-3 grid grid-cols-7 gap-1">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-xs text-white/30 py-1">{d}</div>
              ))}
            </div>

            {/* Day grid */}
            <div className="px-4 pb-3 grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
                const isSelected = day === selected.day && viewMonth === selected.month && viewYear === selected.year;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => selectDay(day)}
                    className={`h-9 rounded-lg text-sm transition-colors ${
                      isSelected
                        ? 'bg-[#fb6400] text-white font-medium'
                        : isToday
                          ? 'bg-white/10 text-[#fb6400]'
                          : 'text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Time picker */}
            {showTime && (
              <div className="px-4 pb-3 flex items-center justify-center gap-2">
                <select
                  value={selHour}
                  onChange={e => setSelHour(Number(e.target.value))}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-[#fb6400]"
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={i} className="bg-[#1a1a2e]">{String(i).padStart(2, '0')}时</option>
                  ))}
                </select>
                <span className="text-white/30">:</span>
                <select
                  value={selMinute}
                  onChange={e => setSelMinute(Number(e.target.value))}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-[#fb6400]"
                >
                  {Array.from({ length: 60 }).map((_, i) => (
                    <option key={i} value={i} className="bg-[#1a1a2e]">{String(i).padStart(2, '0')}分</option>
                  ))}
                </select>
              </div>
            )}

            {/* Actions */}
            <div className="p-4 border-t border-white/10 flex gap-2">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg text-sm transition-colors">
                取消
              </button>
              {showTime ? (
                <button type="button" onClick={confirmTime} className="flex-1 py-2 bg-[#fb6400] hover:bg-[#e55a00] text-white rounded-lg text-sm font-medium transition-colors">
                  确定
                </button>
              ) : (
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2 bg-[#fb6400] hover:bg-[#e55a00] text-white rounded-lg text-sm font-medium transition-colors">
                  确定
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
