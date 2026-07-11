'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import BackButton from '@/components/BackButton';
import FullscreenButton from '@/components/FullscreenButton';
import { useToolHistory } from '@/lib/useToolHistory';

type Mode = 'upload' | 'paste' | 'batch';

interface BatchFile {
  id: string;
  name: string;
  previewHtml: string;
}

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

  // Batch mode states
  const [batchFiles, setBatchFiles] = useState<BatchFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const replaceModeRef = useRef(false);

  const [debouncedMd, setDebouncedMd] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedMd(markdown), 300);
    return () => clearTimeout(timer);
  }, [markdown]);

  // Auto-select first file when batch list goes from empty → populated
  useEffect(() => {
    if (mode === 'batch' && batchFiles.length > 0 && selectedFileId === null) {
      setSelectedFileId(batchFiles[0].id);
    }
  }, [mode, batchFiles, selectedFileId]);

  const currentBatchFile = useMemo(() => {
    if (mode !== 'batch') return null;
    return batchFiles.find(f => f.id === selectedFileId) ?? null;
  }, [mode, selectedFileId, batchFiles]);

  const hasContent = mode === 'batch'
    ? batchFiles.length > 0
    : markdown.trim().length > 0;

  const displayFileName = mode === 'batch'
    ? (currentBatchFile?.name ?? 'document')
    : fileName;

  const previewHtml = useMemo(() => {
    if (mode === 'batch') return currentBatchFile?.previewHtml ?? '';
    if (!debouncedMd.trim()) return '';
    try {
      const raw = marked.parse(debouncedMd) as string;
      return DOMPurify.sanitize(raw);
    } catch {
      return '';
    }
  }, [debouncedMd, mode, currentBatchFile]);

  const fullHtml = useMemo(() => {
    if (!previewHtml) return '';
    return buildFullHtml(previewHtml, displayFileName);
  }, [previewHtml, displayFileName]);

  const previewSrcDoc = useMemo(() => {
    if (!previewHtml) return '';
    return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${EMBED_CSS} body{max-width:100%;padding:1.25rem;font-size:15px}</style></head><body>${previewHtml}</body></html>`;
  }, [previewHtml]);

  // --- Single file processing ---
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

  // --- Batch file processing ---
  const processBatchFiles = useCallback(async (incomingFiles: File[]) => {
    const mdFiles = incomingFiles.filter(f => f.name.match(/\.(md|markdown)$/i));
    if (mdFiles.length === 0) {
      setError('未选择 Markdown 文件');
      return;
    }
    if (mdFiles.length !== incomingFiles.length) {
      setError(`${mdFiles.length} 个 Markdown 文件已添加，${incomingFiles.length - mdFiles.length} 个非 Markdown 文件已跳过`);
    } else {
      setError('');
    }

    const nameCount = new Map<string, number>();
    const tasks = mdFiles.map(file => new Promise<BatchFile | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const md = reader.result as string;
        const baseName = file.name.replace(/\.(md|markdown)$/i, '');
        const n = nameCount.get(baseName) ?? 0;
        nameCount.set(baseName, n + 1);
        const uniqueName = n === 0 ? baseName : `${baseName}(${n})`;
        try {
          const raw = marked.parse(md) as string;
          const clean = DOMPurify.sanitize(raw);
          resolve({
            id: `${uniqueName}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: uniqueName,
            previewHtml: clean,
          });
        } catch {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    }));

    const results = (await Promise.all(tasks)).filter((r): r is BatchFile => r !== null);
    if (results.length === 0) return;

    if (replaceModeRef.current) {
      replaceModeRef.current = false;
      setBatchFiles(results);
      setSelectedFileId(results[0].id);
    } else {
      setBatchFiles(prev => [...prev, ...results]);
    }
  }, []);

  // --- Handlers ---
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
      if (mode === 'batch') {
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) processBatchFiles(files);
      } else {
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
      }
    },
    [mode, processFile, processBatchFiles],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (mode === 'batch') {
        const files = Array.from(e.target.files ?? []);
        if (files.length > 0) processBatchFiles(files);
      } else {
        const file = e.target.files?.[0];
        if (file) processFile(file);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [mode, processFile, processBatchFiles],
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
    a.download = `${displayFileName || 'document'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [fullHtml, displayFileName]);

  const handleClear = useCallback(() => {
    if (mode === 'batch') {
      setBatchFiles([]);
      setSelectedFileId(null);
    } else {
      setMarkdown('');
      setFileName('document');
    }
    setError('');
    setCopied(false);
  }, [mode]);

  const handleModeChange = useCallback((newMode: Mode) => {
    if (newMode === mode) return;
    if (newMode === 'batch') {
      setMarkdown('');
      setFileName('document');
    } else {
      setBatchFiles([]);
      setSelectedFileId(null);
    }
    setMode(newMode);
    setError('');
    setCopied(false);
  }, [mode]);

  const handleReupload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleBatchReupload = useCallback(() => {
    replaceModeRef.current = true;
    fileInputRef.current?.click();
  }, []);

  const handleBatchAdd = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleSingleDownload = useCallback((f: BatchFile) => {
    const html = buildFullHtml(f.previewHtml, f.name);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${f.name}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleBatchDownload = useCallback(() => {
    if (batchFiles.length === 0) return;
    batchFiles.forEach((f, i) => {
      const html = buildFullHtml(f.previewHtml, f.name);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${f.name}.html`;
      // Stagger by 300ms per file to avoid browser blocking mass downloads
      setTimeout(() => {
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, i * 300);
    });
  }, [batchFiles]);

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
              onClick={() => handleModeChange('paste')}
              className={`py-2.5 px-5 rounded-xl text-sm font-medium transition-all ${
                mode === 'paste'
                  ? 'bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white shadow-lg shadow-orange-500/20'
                  : 'glass-card text-white/60 hover:text-white hover:border-white/30'
              }`}
            >
              ✏️ 粘贴内容
            </button>
            <button
              onClick={() => handleModeChange('upload')}
              className={`py-2.5 px-5 rounded-xl text-sm font-medium transition-all ${
                mode === 'upload'
                  ? 'bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white shadow-lg shadow-orange-500/20'
                  : 'glass-card text-white/60 hover:text-white hover:border-white/30'
              }`}
            >
              📁 上传文件
            </button>
            <button
              onClick={() => handleModeChange('batch')}
              className={`py-2.5 px-5 rounded-xl text-sm font-medium transition-all ${
                mode === 'batch'
                  ? 'bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white shadow-lg shadow-orange-500/20'
                  : 'glass-card text-white/60 hover:text-white hover:border-white/30'
              }`}
            >
              📂 批量上传
            </button>
          </div>

          {/* Split Pane */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* LEFT: Editor / File List */}
            <div className="glass-card p-4 flex flex-col min-h-[400px] md:min-h-[500px]">
              {/* Hidden file input — always mounted */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.markdown,text/markdown,text/plain"
                onChange={handleFileChange}
                className="hidden"
                multiple={mode === 'batch'}
              />

              {mode === 'batch' ? (
                // ── Batch mode ──
                batchFiles.length === 0 ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleReupload}
                    className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-[#fb6400] bg-[#fb6400]/10'
                        : 'border-white/20 hover:border-[#fb6400]/50 hover:bg-white/5'
                    }`}
                  >
                    <div className="text-3xl mb-2">📂</div>
                    <p className="text-white/50 text-sm">
                      {isDragging ? '释放文件到这里' : '点击选择多个 .md 文件或拖拽到此处'}
                    </p>
                    <p className="text-white/30 text-xs mt-1">支持批量上传，可同时处理多个文件</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-semibold text-white">
                        📂 共 {batchFiles.length} 个文件
                      </h2>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleBatchAdd}
                          className="text-xs text-white/40 hover:text-[#fb6400] transition-colors"
                        >
                          添加更多
                        </button>
                        <button
                          onClick={handleBatchReupload}
                          className="text-xs text-white/40 hover:text-[#fb6400] transition-colors"
                        >
                          重新选择
                        </button>
                        <button
                          onClick={handleClear}
                          className="text-xs text-white/40 hover:text-[#fb6400] transition-colors"
                        >
                          清除全部
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2">
                      {batchFiles.map(f => (
                        <div
                          key={f.id}
                          onClick={() => setSelectedFileId(f.id)}
                          className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all ${
                            selectedFileId === f.id
                              ? 'bg-[#fb6400]/10 border-[#fb6400]/30'
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <span className="text-white/60 flex-shrink-0">📄</span>
                          <span className="flex-1 text-white text-sm truncate">{f.name}.md</span>
                          <span className="text-green-400 text-xs flex-shrink-0">✓</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSingleDownload(f); }}
                            className="text-white/40 hover:text-[#fb6400] text-xs p-1 flex-shrink-0"
                            title="下载 HTML"
                          >
                            ⬇
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )
              ) : (
                // ── Paste / Upload modes ──
                <>
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
                      onClick={handleReupload}
                      className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                        isDragging
                          ? 'border-[#fb6400] bg-[#fb6400]/10'
                          : 'border-white/20 hover:border-[#fb6400]/50 hover:bg-white/5'
                      }`}
                    >
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
                </>
              )}
            </div>

            {/* RIGHT: Preview */}
            <div className="glass-card p-4 flex flex-col min-h-[400px] md:min-h-[500px]">
              <h2 className="text-sm font-semibold text-white mb-3">👁️ 实时预览</h2>
              {mode === 'batch' && currentBatchFile && (
                <p className="text-xs text-white/40 mb-1">当前：{currentBatchFile.name}.md</p>
              )}
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
                  <p>
                    {mode === 'batch'
                      ? '在左侧选择一个文件进行预览'
                      : '输入 Markdown 后将实时显示效果'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Bar */}
          {mode === 'batch' && batchFiles.length > 0 ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleBatchDownload}
                className="flex-1 py-3 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all text-sm font-medium flex items-center justify-center gap-2"
              >
                📦 批量下载（{batchFiles.length} 个 HTML 文件）
              </button>
              {currentBatchFile && (
                <button
                  onClick={handleDownload}
                  className="flex-1 py-3 bg-white/10 text-white/80 rounded-xl hover:bg-white/20 transition-all text-sm font-medium flex items-center justify-center gap-2"
                >
                  ⬇ 下载 {currentBatchFile.name}.html
                </button>
              )}
            </div>
          ) : hasContent && (
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
