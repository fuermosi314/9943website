'use client';

import { useState, useEffect } from 'react';
import { HistoryRecord, PLATFORMS, CONTENT_TYPES } from '@/lib/types';
import { getHistory, getFavorites, toggleFavorite, deleteHistory } from '@/lib/storage';

interface Props {
  onSelect: (record: HistoryRecord) => void;
  refreshKey: number;
}

export default function HistoryPanel({ onSelect, refreshKey }: Props) {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setRecords(getHistory());
    setFavorites(getFavorites());
  }, [refreshKey]);

  const filtered = showFavoritesOnly
    ? records.filter((r) => favorites.includes(r.id))
    : records;

  const handleToggleFavorite = (id: string) => {
    const updated = toggleFavorite(id);
    setFavorites(updated);
  };

  const handleDelete = (id: string) => {
    deleteHistory(id);
    setRecords(getHistory());
    setFavorites(getFavorites());
  };

  const getPlatformLabel = (val: string) =>
    PLATFORMS.find((p) => p.value === val)?.icon || '';

  const getContentTypeLabel = (val: string) =>
    CONTENT_TYPES.find((t) => t.value === val)?.label || '';

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-all hover:scale-105 z-50"
      >
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {records.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
            {records.length > 99 ? '99+' : records.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-gray-900/95 backdrop-blur-xl border-l border-white/10 z-50 flex flex-col animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h2 className="text-lg font-bold text-white">历史记录</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              showFavoritesOnly
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            {showFavoritesOnly ? '★ 收藏' : '☆ 全部'}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center text-gray-500 py-10">
            {showFavoritesOnly ? '暂无收藏记录' : '暂无历史记录'}
          </div>
        ) : (
          filtered.map((record) => (
            <div
              key={record.id}
              className="bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/10 transition-all cursor-pointer"
              onClick={() => {
                onSelect(record);
                setIsOpen(false);
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span>{getPlatformLabel(record.platform)}</span>
                  <span className="text-xs text-gray-500">{getContentTypeLabel(record.contentType)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(record.id);
                    }}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                  >
                    <span className={favorites.includes(record.id) ? 'text-yellow-400' : 'text-gray-600'}>
                      {favorites.includes(record.id) ? '★' : '☆'}
                    </span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(record.id);
                    }}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 text-gray-600 hover:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className="text-white text-sm font-medium truncate">{record.topic}</p>
              <p className="text-gray-500 text-xs mt-1">
                {new Date(record.createdAt).toLocaleString('zh-CN')}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
