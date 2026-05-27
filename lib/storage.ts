import { HistoryRecord } from './types';

const HISTORY_KEY = 'ai-hook-lab-history';
const FAVORITES_KEY = 'ai-hook-lab-favorites';
const MAX_HISTORY = 50;

// ===== 工具收藏和历史记录 =====
const TOOL_FAVORITES_KEY = '9943-tool-favorites';
const TOOL_HISTORY_KEY = '9943-tool-history';
const MAX_TOOL_HISTORY = 100;

export function getToolFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(TOOL_FAVORITES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function toggleToolFavorite(toolId: string): string[] {
  const favorites = getToolFavorites();
  const index = favorites.indexOf(toolId);
  if (index === -1) {
    favorites.push(toolId);
  } else {
    favorites.splice(index, 1);
  }
  localStorage.setItem(TOOL_FAVORITES_KEY, JSON.stringify(favorites));
  return favorites;
}

export function isToolFavorite(toolId: string): boolean {
  return getToolFavorites().includes(toolId);
}

export interface ToolHistoryRecord {
  toolId: string;
  timestamp: number;
}

export function getToolHistory(): ToolHistoryRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(TOOL_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addToolHistory(toolId: string): void {
  const history = getToolHistory().filter((r) => r.toolId !== toolId);
  history.unshift({ toolId, timestamp: Date.now() });
  if (history.length > MAX_TOOL_HISTORY) {
    history.splice(MAX_TOOL_HISTORY);
  }
  localStorage.setItem(TOOL_HISTORY_KEY, JSON.stringify(history));
}

export function clearToolHistory(): void {
  localStorage.removeItem(TOOL_HISTORY_KEY);
}

export function getHistory(): HistoryRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveHistory(record: HistoryRecord): void {
  const history = getHistory();
  history.unshift(record);
  if (history.length > MAX_HISTORY) {
    history.splice(MAX_HISTORY);
  }
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function deleteHistory(id: string): void {
  const history = getHistory().filter((r) => r.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  // 同时删除收藏
  removeFavorite(id);
}

export function getFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(FAVORITES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function toggleFavorite(id: string): string[] {
  const favorites = getFavorites();
  const index = favorites.indexOf(id);
  if (index === -1) {
    favorites.push(id);
  } else {
    favorites.splice(index, 1);
  }
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  return favorites;
}

export function removeFavorite(id: string): void {
  const favorites = getFavorites().filter((f) => f !== id);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}
