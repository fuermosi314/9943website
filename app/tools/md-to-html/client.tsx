'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
// html2canvas/jspdf are dynamically imported only in client-side callbacks to avoid SSR issues
import BackButton from '@/components/BackButton';
import FullscreenButton from '@/components/FullscreenButton';
import { useToolHistory } from '@/lib/useToolHistory';

type ToolTab = 'md-to-html' | 'html-to-pdf';

type MdMode = 'paste' | 'upload' | 'batch';

interface BatchMdFile {
  id: string;
  name: string;
  previewHtml: string;
}

interface BatchHtmlFile {
  id: string;
  name: string;
  rawHtml: string;
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

// ─── Sidebar ────────────────────────────────────
const tools: { id: ToolTab; label: string; icon: string }[] = [
  { id: 'md-to-html', label: 'MD → HTML', icon: '📝' },
  { id: 'html-to-pdf', label: 'HTML → PDF', icon: '📄' },
];

export default function MdToHtml() {
  useToolHistory('md-to-html');

  const [toolTab, setToolTab] = useState<ToolTab>('md-to-html');

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
        <div className="animate-fade-in">
          <p className="text-white/50 text-sm mb-4">
            {toolTab === 'md-to-html'
              ? '将 Markdown 文件或代码转换为 HTML，支持实时预览、复制代码和下载文件'
              : '将 HTML 文件转换为 PDF，支持直接下载和批量转换'}
          </p>

          <div className="flex gap-4">
            {/* ─── Sidebar ─── */}
            <aside className="w-40 flex-shrink-0 space-y-1">
              {tools.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setToolTab(t.id)}
                  className={`w-full py-3 px-4 rounded-xl text-sm font-medium text-left transition-all ${
                    toolTab === t.id
                      ? 'bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white shadow-lg shadow-orange-500/20'
                      : 'glass-card text-white/60 hover:text-white hover:border-white/30'
                  }`}
                >
                  <span className="mr-2">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </aside>

            {/* ─── Content ─── */}
            <div className="flex-1 min-w-0 space-y-4">
              {toolTab === 'md-to-html' ? <MdToHtmlContent /> : <HtmlToPdfContent />}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── MD → HTML (unchanged) ─────────────────────
function MdToHtmlContent() {
  const [mode, setMode] = useState<MdMode>('paste');
  const [markdown, setMarkdown] = useState('');
  const [fileName, setFileName] = useState('document');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Batch mode states
  const [batchFiles, setBatchFiles] = useState<BatchMdFile[]>([]);
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
    const tasks = mdFiles.map(file => new Promise<BatchMdFile | null>((resolve) => {
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

    const results = (await Promise.all(tasks)).filter((r): r is BatchMdFile => r !== null);
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

  const handleModeChange = useCallback((newMode: MdMode) => {
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

  const handleSingleDownload = useCallback((f: BatchMdFile) => {
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
      setTimeout(() => {
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, i * 300);
    });
  }, [batchFiles]);

  return (
    <>
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
    </>
  );
}

// ─── HTML → PDF ─────────────────────────────────
function HtmlToPdfContent() {
  const [mode, setMode] = useState<'upload' | 'batch'>('upload');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Single upload
  const [htmlContent, setHtmlContent] = useState('');
  const [htmlFileName, setHtmlFileName] = useState('document');
  const [isDragging, setIsDragging] = useState(false);

  // Batch
  const [batchFiles, setBatchFiles] = useState<BatchHtmlFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const replaceModeRef = useRef(false);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);

  const currentBatchFile = useMemo(() => {
    if (mode !== 'batch') return null;
    return batchFiles.find(f => f.id === selectedFileId) ?? null;
  }, [mode, selectedFileId, batchFiles]);

  const currentHtml = mode === 'batch' ? (currentBatchFile?.rawHtml ?? '') : htmlContent;
  const hasContent = mode === 'batch' ? batchFiles.length > 0 : htmlContent.trim().length > 0;
  const currentName = mode === 'batch' ? (currentBatchFile?.name ?? 'document') : htmlFileName;

  // Build iframe srcdoc for preview
  const previewSrcDoc = useMemo(() => {
    if (!currentHtml.trim()) return '';
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans SC",sans-serif;
       padding:1.25rem;font-size:15px;color:#1f2328;max-width:100%;line-height:1.6;word-wrap:break-word}
  img{max-width:100%;height:auto}
  table{border-collapse:collapse;width:100%}
  th,td{border:1px solid #d0d7de;padding:.5em 1em;text-align:left}
  @media print{body{padding:0;font-size:12pt}}
</style>
</head>
<body>${currentHtml}</body>
</html>`;
  }, [currentHtml]);

  // Process single file
  const processFile = useCallback((file: File) => {
    if (!file.name.match(/\.(html|htm)$/i)) {
      setError('请选择 .html 或 .htm 文件');
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      setHtmlContent(reader.result as string);
      setHtmlFileName(file.name.replace(/\.(html|htm)$/i, ''));
    };
    reader.onerror = () => setError('文件读取失败，请重试');
    reader.readAsText(file);
  }, []);

  // Process batch files
  const processBatchFiles = useCallback(async (incomingFiles: File[]) => {
    const htmlFiles = incomingFiles.filter(f => f.name.match(/\.(html|htm)$/i));
    if (htmlFiles.length === 0) {
      setError('未选择 HTML 文件');
      return;
    }
    if (htmlFiles.length !== incomingFiles.length) {
      setError(`${htmlFiles.length} 个 HTML 文件已添加，${incomingFiles.length - htmlFiles.length} 个非 HTML 文件已跳过`);
    } else {
      setError('');
    }

    const nameCount = new Map<string, number>();
    const tasks = htmlFiles.map(file => new Promise<BatchHtmlFile | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const baseName = file.name.replace(/\.(html|htm)$/i, '');
        const n = nameCount.get(baseName) ?? 0;
        nameCount.set(baseName, n + 1);
        const uniqueName = n === 0 ? baseName : `${baseName}(${n})`;
        resolve({
          id: `${uniqueName}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: uniqueName,
          rawHtml: reader.result as string,
        });
      };
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    }));

    const results = (await Promise.all(tasks)).filter((r): r is BatchHtmlFile => r !== null);
    if (results.length === 0) return;

    if (replaceModeRef.current) {
      replaceModeRef.current = false;
      setBatchFiles(results);
      setSelectedFileId(results[0].id);
    } else {
      setBatchFiles(prev => [...prev, ...results]);
    }
  }, []);

  /** Create an invisible container inside the viewport so html2canvas can
 *  paint it without causing flicker or blank PDFs. */
function createInvisibleContainer(html: string): HTMLDivElement {
  const el = document.createElement('div');
  el.innerHTML = html;
  el.style.position = 'absolute';
  el.style.left = '0';
  el.style.top = '0';
  el.style.width = '800px';
  el.style.opacity = '0.01';
  el.style.pointerEvents = 'none';
  el.style.zIndex = '-9999';
  return el;
}

/**
 * 收集「安全切割线」：块级元素区间合并后，相邻区间的缝隙中点即安全线（canvas 像素）。
 * 切点落在缝隙处可保证文字行、图片、表格行不被从中间切断。
 * 容器类标签（div/table/ul 等）若内含内容标签子孙则让位不收集，避免外层大容器吞掉所有缝隙。
 */
function collectSafeLines(container: HTMLElement, domToCanvas: number): number[] {
  const containerSel = 'div,section,article,aside,header,footer,main,form,fieldset,table,ul,ol,figure,blockquote';
  const contentSel = 'h1,h2,h3,h4,h5,h6,p,li,tr,th,td,pre,img,hr,svg,figcaption,caption,legend';
  const containerTop = container.getBoundingClientRect().top;
  const ranges: Array<[number, number]> = [];

  container.querySelectorAll(`${contentSel},${containerSel}`).forEach(node => {
    const el = node as HTMLElement;
    // 包着内容子元素的容器让位给子元素；纯叶子容器（如包单张图的 div）仍需收集
    if (el.matches(containerSel) && el.querySelector(contentSel)) return;
    const r = el.getBoundingClientRect();
    if (r.height === 0) return; // display:none / 空元素
    ranges.push([r.top - containerTop, r.bottom - containerTop]);
  });

  // 排序并合并重叠区间（子元素区间被父元素包含的直接丢弃）
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const [top, bottom] of ranges) {
    const last = merged[merged.length - 1];
    if (last && top < last[1]) {
      last[1] = Math.max(last[1], bottom);
    } else {
      merged.push([top, bottom]);
    }
  }

  // 相邻区间缝隙中点 = 安全线，换算为 canvas 像素
  const safeLines: number[] = [];
  for (let i = 0; i + 1 < merged.length; i++) {
    safeLines.push(((merged[i][1] + merged[i + 1][0]) / 2) * domToCanvas);
  }
  return safeLines;
}

// ── Convert HTML to PDF and download directly ──
// html2pdf.js 在 Chromium 下渲染空白画布（0.14 库 bug），改用 html2canvas + jsPDF 手动合成
// 分页用「智能安全切割线」：切点落在块级元素缝隙处，避免文字行/图片/表格行被从中间切断
async function renderHtmlToPdf(html: string, filename: string): Promise<void> {
  const container = createInvisibleContainer(html);
  document.body.appendChild(container);

  try {
    const html2canvasMod = await import('html2canvas');
    const html2canvas = html2canvasMod.default ?? html2canvasMod;
    const { jsPDF } = await import('jspdf');

    // opacity 0.01 会让画布以 1% alpha 绘制而近乎全白，渲染前临时还原
    container.style.opacity = '1';

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      width: 800,
      backgroundColor: '#ffffff',
    });

    const pdf = new jsPDF({ unit: 'in', format: 'a4', orientation: 'portrait' });
    const contentWidth = 7.5; // A4 宽 8.5in - 左右边距各 0.5in
    const pageContentH = 10; // A4 高 11in - 上下边距各 0.5in
    const pxPerInch = canvas.width / contentWidth;
    const sliceH = Math.floor(pageContentH * pxPerInch);
    const minSlice = 400; // canvas px（≈200 DOM px），切点距页顶不足则回退硬切，避免极矮页

    // 安全线 = 块级元素缝隙中点（canvas 坐标）
    const safeLines = collectSafeLines(container, canvas.width / container.offsetWidth);

    let pageTop = 0;
    let pageIdx = 0;
    while (pageTop < Math.max(canvas.height, 1)) {
      if (pageIdx > 0) pdf.addPage();
      // 本页硬边界 = 起点 + 一页内容高（最后一页切到 canvas 末尾）
      const hardEnd = Math.min(pageTop + sliceH, canvas.height);
      // 切点 = 页内 ≤ hardEnd 的最大安全线；距页顶不足 minSlice 或页内无安全线则回退硬切
      let cut = hardEnd;
      for (let i = safeLines.length - 1; i >= 0; i--) {
        const line = safeLines[i];
        if (line > pageTop && line <= hardEnd) {
          if (line - pageTop >= minSlice) cut = line;
          break;
        }
      }
      const srcH = cut - pageTop;
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = srcH;
      pageCanvas.getContext('2d')!.drawImage(
        canvas, 0, pageTop, canvas.width, srcH,
        0, 0, canvas.width, srcH,
      );
      pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0.5, 0.5, contentWidth, srcH / pxPerInch);
      pageTop = cut;
      pageIdx++;
    }

    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}

  const handleConvertToPdf = useCallback(async (htmlToConvert?: string) => {
    const html = htmlToConvert ?? currentHtml;
    if (!html.trim()) return;

    setError('');

    try {
      await renderHtmlToPdf(html, `${currentName}.pdf`);
    } catch {
      setError('PDF 生成失败，请检查 HTML 内容是否正确');
    }
  }, [currentHtml, currentName]);

  // ── Batch convert all files one by one ──
  const handleBatchConvert = useCallback(async () => {
    if (batchFiles.length === 0) return;
    setError('');

    let converted = 0;

    for (let i = 0; i < batchFiles.length; i++) {
      const f = batchFiles[i];

      try {
        await renderHtmlToPdf(f.rawHtml, `${f.name}.pdf`);
        converted++;
      } catch {
        // skip failed file
      }
    }

    if (converted < batchFiles.length) {
      setError(`${converted}/${batchFiles.length} 个文件转换成功，${batchFiles.length - converted} 个失败`);
    }
  }, [batchFiles]);

  // Drag/drop handlers
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

  const handleClear = useCallback(() => {
    if (mode === 'batch') {
      setBatchFiles([]);
      setSelectedFileId(null);
    } else {
      setHtmlContent('');
      setHtmlFileName('document');
    }
    setError('');
  }, [mode]);

  const handleModeChange = useCallback((newMode: 'upload' | 'batch') => {
    if (newMode === mode) return;
    if (newMode === 'batch') {
      setHtmlContent('');
      setHtmlFileName('document');
    } else {
      setBatchFiles([]);
      setSelectedFileId(null);
    }
    setMode(newMode);
    setError('');
  }, [mode]);

  return (
    <>
      {/* Mode Toggle */}
      <div className="flex gap-2">
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
        {/* LEFT: File List / Upload Area */}
        <div className="glass-card p-4 flex flex-col min-h-[400px] md:min-h-[500px]">
          <input
            ref={fileInputRef}
            type="file"
            accept=".html,.htm,text/html"
            onChange={handleFileChange}
            className="hidden"
            multiple={mode === 'batch'}
          />

          {mode === 'batch' ? (
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
                  {isDragging ? '释放文件到这里' : '点击选择多个 .html 文件或拖拽到此处'}
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
                      <span className="flex-1 text-white text-sm truncate">{f.name}.html</span>
                      <span className="text-green-400 text-xs flex-shrink-0">✓</span>
                    </div>
                  ))}
                </div>
              </>
            )
          ) : (
            // ── Single upload ──
            <>
              {hasContent ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-white">📄 HTML 文件</h2>
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
                        清空
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                    className="flex-1 w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#fb6400] transition-all resize-none font-mono leading-relaxed"
                  />
                </>
              ) : (
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
                    {isDragging ? '释放文件到这里' : '点击选择 .html 文件或拖拽到此处'}
                  </p>
                  <p className="text-white/30 text-xs mt-1">支持 .html、.htm 格式</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* RIGHT: Preview */}
        <div className="glass-card p-4 flex flex-col min-h-[400px] md:min-h-[500px]">
          <h2 className="text-sm font-semibold text-white mb-3">👁️ 预览</h2>
          {mode === 'batch' && currentBatchFile && (
            <p className="text-xs text-white/40 mb-1">当前：{currentBatchFile.name}.html</p>
          )}
          {previewSrcDoc ? (
            <iframe
              ref={previewFrameRef}
              srcDoc={previewSrcDoc}
              className="flex-1 w-full border-0 rounded-lg bg-white"
              title="HTML 预览"
              sandbox="allow-same-origin"
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-white/30 text-sm space-y-2">
              <div className="text-2xl">📄</div>
              <p>
                {mode === 'batch'
                  ? '在左侧选择一个文件进行预览'
                  : '上传 HTML 文件后将显示预览效果'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Bar */}
      {mode === 'batch' && batchFiles.length > 0 ? (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleBatchConvert}
            className="flex-1 py-3 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all text-sm font-medium flex items-center justify-center gap-2"
          >
            📦 批量转 PDF（{batchFiles.length} 个文件）
          </button>
          {currentBatchFile && (
            <button
              onClick={() => handleConvertToPdf()}
              className="flex-1 py-3 bg-white/10 text-white/80 rounded-xl hover:bg-white/20 transition-all text-sm font-medium flex items-center justify-center gap-2"
            >
              ⬇ 下载 {currentBatchFile.name}.pdf
            </button>
          )}
        </div>
      ) : hasContent && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => handleConvertToPdf()}
            className="flex-1 py-3 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all text-sm font-medium flex items-center justify-center gap-2"
          >
            ⬇ 下载 PDF
          </button>
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