'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import BackButton from '@/components/BackButton';
import FullscreenButton from '@/components/FullscreenButton';
import { useToolHistory } from '@/lib/useToolHistory';

type Mode = 'upload' | 'paste';

const EMBED_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans SC",sans-serif;font-size:16px;line-height:1.6;color:#1f2328;max-width:900px;margin:0 auto;padding:2rem;background:#fff;word-wrap:break-word}
h1,h2,h3,h4,h5,h6{margin-top:1.5em;margin-bottom:0.5em;font-weight:600;line-height:1.25}
h1{font-size:2em;border-bottom:1px solid #d0d7de;padding-bottom:.3em}
h2{font-size:1.5em;border-bottom:1px solid #d0d7de;padding-bottom:.3em}
h3{font-size:1.25em}h4{font-size:1em}h5{font-size:.875em}h6{font-size:.85em;color:#656d76}
p{margin:0.5em 0}
a{color:#0969da;text-decoration:none}
a:hover{text-decoration:underline}
strong{font-weight:600}
code{background:#f6f8fa;padding:.2em .4em;border-radius:3px;font-family:"SFMono-Regular",Consolas,"Liberation Mono",Menlo,monospace;font-size:85%}
pre{background:#f6f8fa;padding:1rem;border-radius:6px;overflow-x:auto;margin:0.5em 0}
pre code{background:none;padding:0;font-size:85%}
blockquote{border-left:4px solid #d0d7de;padding:0 1em;color:#656d76;margin:0.5em 0}
ul,ol{padding-left:2em;margin:0.5em 0}
li{margin:0.25em 0}
li:has(input[type=checkbox]){list-style:none}
input[type=checkbox]{margin-right:.5em}
table{border-collapse:collapse;margin:0.5em 0;width:100%;display:block;overflow-x:auto}
th,td{border:1px solid #d0d7de;padding:.5em 1em;text-align:left}
th{background:#f6f8fa;font-weight:600}
tr:nth-child(even){background:#f6f8fa}
img{max-width:100%;height:auto}
hr{border:none;border-top:1px solid #d0d7de;margin:1em 0}
@media(max-width:640px){body{padding:1rem;font-size:14px}}
@media print{body{max-width:none;padding:1cm}}
`.trim();

function buildFullHtml(body: string, title: string): string {
  const escapedTitle = title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapedTitle}</title>
<style>${EMBED_CSS}</style>
</head>
<body>
${body}
</body>
</html>`;
}

export default function MdToHtml() {
  useToolHistory('md-to-html');

  const [mode, setMode] = useState<Mode>('paste');
  const [markdown, setMarkdown] = useState('');
  const [fileName, setFileName] = useState('document');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [debouncedMd, setDebouncedMd] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedMd(markdown), 300);
    return () => clearTimeout(timer);
  }, [markdown]);

  const previewHtml = useMemo(() => {
    if (!debouncedMd.trim()) return '';
    try {
      const raw = marked.parse(debouncedMd) as string;
      return DOMPurify.sanitize(raw);
    } catch {
      return '';
    }
  }, [debouncedMd]);

  const fullHtml = useMemo(() => {
    if (!previewHtml) return '';
    return buildFullHtml(previewHtml, fileName);
  }, [previewHtml, fileName]);

  const hasContent = markdown.trim().length > 0;

  const processFile = useCallback((file: File) => {
    if (!file.name.match(/\.(md|markdown)$/i)) {
      setError('请选择 .md 或 .markdown 文件');
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      setMarkdown(reader.result as string);
      setFileName(file.name.replace(/\.(md|markdown)$/i, ''));
    };
    reader.onerror = () => setError('文件读取失败，请重试');
    reader.readAsText(file);
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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [processFile],
  );

  const handleCopyHtml = useCallback(async () => {
    if (!fullHtml) return;
    try {
      await navigator.clipboard.writeText(fullHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('复制失败，请检查浏览器权限');
    }
  }, [fullHtml]);

  const handleDownload = useCallback(() => {
    if (!fullHtml) return;
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName || 'document'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [fullHtml, fileName]);

  const handleClear = useCallback(() => {
    setMarkdown('');
    setFileName('document');
    setError('');
    setCopied(false);
  }, []);

  const handleReupload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const previewSrcDoc = useMemo(() => {
    if (!previewHtml) return '';
    return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${EMBED_CSS} body{max-width:100%;padding:1.25rem;font-size:15px}</style></head><body>${previewHtml}</body></html>`;
  }, [previewHtml]);

  return (
    <div className="min-h-screen relative z-10">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl safe-area-top border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center">
          <BackButton category="document" />
          <div className="flex items-center space-x-3">
            <img
              src="/logo.png"
              alt="9943"
              className="w-8 h-8 rounded-lg shadow-lg shadow-orange-500/30"
            />
            <h1 className="text-lg font-semibold text-white">Markdown 转 HTML</h1>
          </div>
          <FullscreenButton className="ml-auto" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <div className="animate-fade-in space-y-4">
          {/* Description */}
          <p className="text-white/50 text-sm">
            将 Markdown 文件或代码转换为 HTML，支持实时预览、复制代码和下载文件
          </p>

          {/* Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode('paste')}
              className={`py-2.5 px-5 rounded-xl text-sm font-medium transition-all ${
                mode === 'paste'
                  ? 'bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white shadow-lg shadow-orange-500/20'
                  : 'glass-card text-white/60 hover:text-white hover:border-white/30'
              }`}
            >
              ✏️ 粘贴内容
            </button>
            <button
              onClick={() => setMode('upload')}
              className={`py-2.5 px-5 rounded-xl text-sm font-medium transition-all ${
                mode === 'upload'
                  ? 'bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white shadow-lg shadow-orange-500/20'
                  : 'glass-card text-white/60 hover:text-white hover:border-white/30'
              }`}
            >
              📁 上传文件
            </button>
          </div>

          {/* Split Pane */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* LEFT: Editor */}
            <div className="glass-card p-4 flex flex-col min-h-[400px] md:min-h-[500px]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white">
                  {mode === 'upload' ? '📄 Markdown 文件' : '✏️ Markdown 源码'}
                </h2>
                <div className="flex items-center gap-3">
                  {mode === 'upload' && hasContent && (
                    <button
                      onClick={handleReupload}
                      className="text-xs text-white/40 hover:text-[#fb6400] transition-colors"
                    >
                      重新选择文件
                    </button>
                  )}
                  {hasContent && (
                    <button
                      onClick={handleClear}
                      className="text-xs text-white/40 hover:text-[#fb6400] transition-colors"
                    >
                      清空
                    </button>
                  )}
                </div>
              </div>

              {mode === 'upload' && !hasContent ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-[#fb6400] bg-[#fb6400]/10'
                      : 'border-white/20 hover:border-[#fb6400]/50 hover:bg-white/5'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md,.markdown"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="text-3xl mb-2">📄</div>
                  <p className="text-white/50 text-sm">
                    {isDragging ? '释放文件到这里' : '点击选择 .md 文件或拖拽到此处'}
                  </p>
                  <p className="text-white/30 text-xs mt-1">支持 .md、.markdown 格式</p>
                </div>
              ) : (
                <textarea
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  placeholder={
                    mode === 'paste'
                      ? '在此输入或粘贴 Markdown 代码...'
                      : '文件内容将显示在此处，可直接编辑...'
                  }
                  className="flex-1 w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#fb6400] transition-all resize-none font-mono leading-relaxed"
                />
              )}
            </div>

            {/* RIGHT: Preview */}
            <div className="glass-card p-4 flex flex-col min-h-[400px] md:min-h-[500px]">
              <h2 className="text-sm font-semibold text-white mb-3">👁️ 实时预览</h2>
              {previewHtml ? (
                <iframe
                  srcDoc={previewSrcDoc}
                  className="flex-1 w-full border-0 rounded-lg bg-white"
                  title="Markdown 预览"
                  sandbox=""
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-white/30 text-sm space-y-2">
                  <div className="text-2xl">📝</div>
                  <p>输入 Markdown 后将实时显示效果</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Bar */}
          {hasContent && (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleCopyHtml}
                className="flex-1 py-3 bg-white/10 text-white/80 rounded-xl hover:bg-white/20 transition-all text-sm font-medium flex items-center justify-center gap-2"
              >
                {copied ? '✅ 已复制到剪贴板' : '📋 复制 HTML 代码'}
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 py-3 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all text-sm font-medium flex items-center justify-center gap-2"
              >
                ⬇ 下载 HTML 文件
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="glass-card p-4 animate-fade-in border border-red-500/30">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
