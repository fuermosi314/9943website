'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 上传入口的统一行为层：提供「拖拽」与「粘贴」两条路径。
 *
 * 「点击选择文件」由各工具自己的 <input type="file"> 处理，不在本模块范围内。
 * 各工具只需把已有的 processFile / processFiles 传给 onFiles，不必改动它。
 *
 * 用法：
 *   const { isDragging, dropProps } = useFileUpload({
 *     onFiles: (files) => processFile(files[0]),
 *     accept: 'image/*',
 *     onReject: setError,
 *   });
 */

/** 按 input 的 accept 语法匹配文件，兼容 "image/*" 与 ".pdf" 两种写法 */
export function matchAccept(file: File, accept?: string): boolean {
  if (!accept) return true;
  const tokens = accept.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
  if (tokens.length === 0) return true;
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  return tokens.some(token => {
    if (token.startsWith('.')) return name.endsWith(token);
    if (token.endsWith('/*')) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
}

/** 从 DataTransfer / 剪贴板数据中取出文件，兼容 files 与 items 两条路径 */
export function filesFromDataTransfer(dt: DataTransfer | null, accept?: string): File[] {
  if (!dt) return [];
  const out: File[] = [];
  const push = (f: File | null) => {
    if (f && matchAccept(f, accept)) out.push(f);
  };
  if (dt.files && dt.files.length > 0) {
    for (let i = 0; i < dt.files.length; i++) push(dt.files[i]);
  } else if (dt.items) {
    for (let i = 0; i < dt.items.length; i++) {
      if (dt.items[i].kind === 'file') push(dt.items[i].getAsFile());
    }
  }
  return out;
}

/** 把文件塞进一个已有的 <input type="file">，让原有的 handleFileChange / 导入按钮逻辑照常工作 */
export function setInputFiles(input: HTMLInputElement | null, files: File[]): boolean {
  if (!input || files.length === 0) return false;
  const dt = new DataTransfer();
  files.forEach(f => dt.items.add(f));
  input.files = dt.files;
  return true;
}

interface Options {
  /** 收到合格文件时调用，通常直接传各工具已有的 processFile / processFiles */
  onFiles: (files: File[]) => void;
  /** 同 input 的 accept，用于过滤；留空表示不过滤 */
  accept?: string;
  /** 传 false 可关闭粘贴监听。已自带粘贴实现的弹窗（日记配图、天机阁家具图）必须传 false，否则会重复触发 */
  enabled?: boolean;
  /** 粘贴的是文本时可尝试处理，返回 true 表示已消费掉这次粘贴 */
  textHandler?: (text: string) => boolean;
  /** 文件类型不匹配时给出提示 */
  onReject?: (message: string) => void;
}

export function useFileUpload({ onFiles, accept, enabled = true, textHandler, onReject }: Options) {
  const [isDragging, setIsDragging] = useState(false);

  // 回调放进 ref，这样调用方不必 memo 化，粘贴监听也只挂一次
  const cbRef = useRef({ onFiles, accept, textHandler, onReject });
  cbRef.current = { onFiles, accept, textHandler, onReject };

  useEffect(() => {
    if (!enabled) return;

    const handlePaste = (e: ClipboardEvent) => {
      // 不抢输入框 / 可编辑区域的粘贴
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
      }

      const { accept, onFiles, textHandler, onReject } = cbRef.current;
      const dt = e.clipboardData;

      const files = filesFromDataTransfer(dt, accept);
      if (files.length > 0) {
        e.preventDefault();
        onFiles(files);
        return;
      }

      // 剪贴板里确实有文件，只是格式不符 —— 给提示，不再静默忽略
      const anyFiles = filesFromDataTransfer(dt, undefined);
      if (anyFiles.length > 0) {
        onReject?.(`不支持的文件格式：${anyFiles.map(f => f.name).join('、')}`);
        return;
      }

      if (textHandler) {
        const text = dt?.getData('text/plain') ?? '';
        if (text && textHandler(text)) e.preventDefault();
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [enabled]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const { accept, onFiles, onReject } = cbRef.current;
    const files = filesFromDataTransfer(e.dataTransfer, accept);
    if (files.length > 0) {
      onFiles(files);
      return;
    }
    const anyFiles = filesFromDataTransfer(e.dataTransfer, undefined);
    if (anyFiles.length > 0) {
      onReject?.(`不支持的文件格式：${anyFiles.map(f => f.name).join('、')}`);
    }
  }, []);

  return { isDragging, dropProps: { onDragOver, onDragLeave, onDrop } };
}