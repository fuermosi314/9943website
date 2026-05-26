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
