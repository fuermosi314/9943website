export type Platform = 'xiaohongshu' | 'douyin' | 'bilibili' | 'youtube' | 'x';

export type ContentType = 'video' | 'image-text' | 'ad' | 'tutorial' | 'opinion';

export interface Hook {
  text: string;
  style: string;
  score: number;
  reason: string;
}

export interface GenerateRequest {
  topic: string;
  platform: Platform;
  contentType: ContentType;
}

export interface GenerateResponse {
  hooks: Hook[];
}

export interface HistoryRecord {
  id: string;
  topic: string;
  platform: Platform;
  contentType: ContentType;
  hooks: Hook[];
  createdAt: string;
}

export const PLATFORMS: { value: Platform; label: string; icon: string }[] = [
  { value: 'xiaohongshu', label: '小红书', icon: '📕' },
  { value: 'douyin', label: '抖音', icon: '🎵' },
  { value: 'bilibili', label: 'B站', icon: '📺' },
  { value: 'youtube', label: 'YouTube', icon: '▶️' },
  { value: 'x', label: 'X', icon: '𝕏' },
];

export const CONTENT_TYPES: { value: ContentType; label: string; icon: string }[] = [
  { value: 'video', label: '视频', icon: '🎬' },
  { value: 'image-text', label: '图文', icon: '🖼️' },
  { value: 'ad', label: '产品广告', icon: '📢' },
  { value: 'tutorial', label: '教程', icon: '📚' },
  { value: 'opinion', label: '观点帖', icon: '💬' },
];
