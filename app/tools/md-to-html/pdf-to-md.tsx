'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { extractPdf, linesToMarkdown, type PdfPage } from '@/lib/pdf2md';
import { EMBED_CSS, buildFullHtml } from '@/lib/html-export';

// PDF → Markdown：pdf.js 提取文本 → 启发式重建（免费秒出），
// 「🤖 AI 增强」按钮可选调用 DeepSeek 还原结构（质量更好）

export default function PdfToMdContent() {
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [markdown, setMarkdown] = useState('');
  const [pagesText, setPagesText] = useState<string[]>([]); // 供 AI 增强使用
  const [fileNameHint, setFileNameHint] = useState('document');

  // 编辑 Markdown 后的预览（300ms debounce）
  const [debouncedMd, setDebouncedMd] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedMd(markdown), 300);
    return () => clearTimeout(timer);
  }, [markdown]);

  const previewHtml = useMemo(() => {
    if (!debouncedMd.trim()) return '';
    try {
      return DOMPurify.sanitize(marked.parse(debouncedMd) as string);
    } catch {
      return '';
    }
  }, [debouncedMd]);

  const previewSrcDoc = useMemo(() => {
    if (!previewHtml) return '';
    return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${EMBED_CSS} body{max-width:100%;padding:1.25rem;font-size:15px}</style></head><body>${previewHtml}</body></html>`;
  }, [previewHtml]);

  const hasContent = markdown.trim().length > 0;

  // 上传 → 提取 → 启发式重建
  const processFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.pdf$/i)) {
      setError('请选择 .pdf 文件');
      return;
    }
    setError('');
    setExtracting(true);
    setFileName(file.name);
    setFileNameHint(file.name.replace(/\.pdf$/i, ''));
    try {
      const pages: PdfPage[] = await extractPdf(file);
      setPagesText(pages.map(p => p.text));
      const md = linesToMarkdown(pages);
      if (!md.trim()) {
        setError('PDF 中未提取到文字，可能是扫描版（图片型）PDF，无法直接转换');
        setMarkdown('');
      } else {
        setMarkdown(md);
      }
    } catch {
      setError('PDF 解析失败，请确认文件未损坏或不是加密 PDF');
      setMarkdown('');
    } finally {
      setExtracting(false);
    }
  }, []);

  // AI 增强：把提取的纯文本发给 DeepSeek 还原结构
  const handleAiEnhance = useCallback(async () => {
    if (pagesText.length === 0 || aiLoading) return;
    setAiLoading(true);
    setError('');
    try {
      const res = await fetch('/api/pdf-to-md', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages: pagesText }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'AI 增强失败');
      }
      setMarkdown(data.markdown ?? '');
      if (!data.markdown) setError('AI 返回结果为空，请重试');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI 增强失败，请重试');
    } finally {
      setAiLoading(false);
    }
  }, [pagesText, aiLoading]);

  const handleCopy = useCallback(async () => {
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('复制失败，请检查浏览器权限');
    }
  }, [markdown]);

  const handleDownloadMd = useCallback(() => {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileNameHint || 'document'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [markdown, fileNameHint]);

  const handleDownloadHtml = useCallback(() => {
    if (!markdown) return;
    const html = buildFullHtml(DOMPurify.sanitize(marked.parse(markdown) as string), fileNameHint);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileNameHint || 'document'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [markdown, fileNameHint]);

  const handleClear = useCallback(() => {
    setMarkdown('');
    setPagesText([]);
    setFileName('');
    setError('');
    setCopied(false);
  }, []);

  const handleReupload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [processFile],
  );

  return (
    <>
      {/* Upload Area */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />
      {!hasContent && !extracting ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleReupload}
          className={`glass-card p-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all min-h-[400px] md:min-h-[500px] ${
            isDragging
              ? 'border-[#fb6400] bg-[#fb6400]/10'
              : 'border-white/20 hover:border-[#fb6400]/50 hover:bg-white/5'
          }`}
        >
          <div className="text-3xl mb-2">📑</div>
          <p className="text-white/50 text-sm">
            {isDragging ? '释放文件到这里' : '点击选择 .pdf 文件或拖拽到此处'}
          </p>
          <p className="text-white/30 text-xs mt-1">
            支持文字型 PDF；扫描版（图片型）PDF 无法提取文字
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {hasContent && (
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">📄 {fileName}</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleReupload}
                  className="text-xs text-white/40 hover:text-[#fb6400] transition-colors"
                >
                  重新选择
                </button>
                <button
                  onClick={handleClear}
                  className="text-xs text-white/40 hover:text-[#fb6400] transition-colors"
                >
                  清除
                </button>
              </div>
            </div>
          )}

          {/* Split Pane */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* LEFT: Markdown Source */}
            <div className="glass-card p-4 flex flex-col min-h-[400px] md:min-h-[500px]">
              <h2 className="text-sm font-semibold text-white mb-3">📝 Markdown 源码</h2>
              {hasContent ? (
                <textarea
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  className="flex-1 w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#fb6400] transition-all resize-none font-mono leading-relaxed"
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-white/30 text-sm space-y-2">
                  <div className="text-2xl">⏳</div>
                  <p>正在提取 PDF 文字并重建 Markdown...</p>
                </div>
              )}
            </div>

            {/* RIGHT: Preview */}
            <div className="glass-card p-4 flex flex-col min-h-[400px] md:min-h-[500px]">
              <h2 className="text-sm font-semibold text-white mb-3">👁️ 预览</h2>
              {previewHtml ? (
                <iframe
                  srcDoc={previewSrcDoc}
                  className="flex-1 w-full border-0 rounded-lg bg-white"
                  title="Markdown 预览"
                  sandbox=""
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-white/30 text-sm space-y-2">
                  <div className="text-2xl">👁️</div>
                  <p>转换结果将实时显示在这里</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Bar */}
          {hasContent && (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleAiEnhance}
                disabled={aiLoading}
                className="flex-1 py-3 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aiLoading ? '⏳ AI 还原中…' : '🤖 AI 增强（更准确的还原）'}
              </button>
              <button
                onClick={handleCopy}
                className="flex-1 py-3 bg-white/10 text-white/80 rounded-xl hover:bg-white/20 transition-all text-sm font-medium flex items-center justify-center gap-2"
              >
                {copied ? '✅ 已复制' : '📋 复制 Markdown'}
              </button>
              <button
                onClick={handleDownloadMd}
                className="flex-1 py-3 bg-white/10 text-white/80 rounded-xl hover:bg-white/20 transition-all text-sm font-medium flex items-center justify-center gap-2"
              >
                ⬇ 下载 .md
              </button>
              <button
                onClick={handleDownloadHtml}
                className="flex-1 py-3 bg-white/10 text-white/80 rounded-xl hover:bg-white/20 transition-all text-sm font-medium flex items-center justify-center gap-2"
              >
                ⬇ 下载 .html
              </button>
            </div>
          )}

          {aiLoading && (
            <p className="text-white/40 text-xs text-center">
              AI 正在逐段还原文档结构，大文档可能需要一点时间...
            </p>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="glass-card p-4 animate-fade-in border border-red-500/30">
          <p className="text-red-400 text-sm text-center">{error}</p>
        </div>
      )}
    </>
  );
}
