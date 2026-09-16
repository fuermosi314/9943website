'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { markdownToPdf, htmlToPdf, getTurndown } from '@/lib/md2pdf';
import { EMBED_CSS, buildFullHtml } from '@/lib/html-export';
import { htmlToImagePdf } from '@/lib/html-to-image-pdf';
import { printHtmlToPdf } from '@/lib/print-pdf';
import BackButton from '@/components/BackButton';
import FullscreenButton from '@/components/FullscreenButton';
import { useToolHistory } from '@/lib/useToolHistory';
import { useFileUpload } from '@/lib/useFileUpload';
import PdfToMdContent from './pdf-to-md';

type ToolTab = 'md-to-html' | 'html-to-pdf' | 'pdf-to-md';

type MdMode = 'paste' | 'upload' | 'batch';

interface BatchMdFile {
  id: string;
  name: string;
  previewHtml: string;
  rawMd: string; // 原始 Markdown，用于 PDF 转换
}

interface BatchHtmlFile {
  id: string;
  name: string;
  rawHtml: string;
}

// ─── Sidebar ────────────────────────────────────
const tools: { id: ToolTab; label: string; icon: string }[] = [
  { id: 'md-to-html', label: 'MD → HTML/PDF', icon: '📝' },
  { id: 'html-to-pdf', label: 'HTML → PDF/MD', icon: '📄' },
  { id: 'pdf-to-md', label: 'PDF → MD/HTML', icon: '📑' },
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
            <h1 className="text-lg font-semibold text-white">Markdown 转 HTML/PDF</h1>
          </div>
          <FullscreenButton className="ml-auto" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <div className="animate-fade-in">
          <p className="text-white/50 text-sm mb-4">
            {toolTab === 'md-to-html' &&
              '将 Markdown 转换为 HTML 或 PDF，支持实时预览、复制代码和下载文件'}
            {toolTab === 'html-to-pdf' &&
              '将 HTML 转换为 PDF 或 Markdown，支持直接下载和批量转换'}
            {toolTab === 'pdf-to-md' &&
              '将 PDF 文件转换为 Markdown 或 HTML，支持 AI 增强还原结构'}
          </p>

          <div className="flex gap-4">
            {/* ─── Sidebar ─── */}
            <aside className="w-52 flex-shrink-0 space-y-1">
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
              {toolTab === 'md-to-html' && <MdToHtmlContent />}
              {toolTab === 'html-to-pdf' && <HtmlToPdfContent />}
              {toolTab === 'pdf-to-md' && <PdfToMdContent />}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── MD → HTML (unchanged) ─────────────────────
function MdToHtmlContent() {
  const [mode, setMode] = useState<MdMode>('upload');
  const [markdown, setMarkdown] = useState('');
  const [fileName, setFileName] = useState('document');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Batch mode states
  const [batchFiles, setBatchFiles] = useState<BatchMdFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const replaceModeRef = useRef(false);
  const [converting, setConverting] = useState(false);

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
            rawMd: md,
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
  const { isDragging, dropProps } = useFileUpload({
    onFiles: (files) => {
      if (mode === 'batch') {
        processBatchFiles(files);
      } else if (files[0]) {
        processFile(files[0]);
      }
    },
    accept: '.md,.markdown,text/markdown,text/plain',
    onReject: setError,
  });

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

  // ─── MD → 文字型 PDF（pdfmake） ───
  const handleDownloadPdf = useCallback(async (md?: string, name?: string) => {
    const source = md ?? markdown;
    if (!source.trim()) return;
    setConverting(true);
    setError('');
    try {
      await markdownToPdf(source, `${name ?? displayFileName}.pdf`);
    } catch {
      setError('PDF 生成失败，请检查 Markdown 内容');
    } finally {
      setConverting(false);
    }
  }, [markdown, displayFileName]);

  const handleBatchPdf = useCallback(async () => {
    if (batchFiles.length === 0) return;
    setConverting(true);
    setError('');
    let ok = 0;
    for (const f of batchFiles) {
      try {
        await markdownToPdf(f.rawMd, `${f.name}.pdf`);
        ok++;
      } catch {
        // 单个文件失败不影响后续
      }
    }
    setConverting(false);
    if (ok < batchFiles.length) {
      setError(`${ok}/${batchFiles.length} 个文件转换成功，${batchFiles.length - ok} 个失败`);
    }
  }, [batchFiles]);

  // ─── MD → 图片型 PDF（html2canvas + jsPDF，所见即所得、文字不可搜索） ───
  const handleDownloadImagePdf = useCallback(async () => {
    if (!fullHtml) return;
    setConverting(true);
    setError('');
    try {
      await htmlToImagePdf(fullHtml, `${displayFileName}.pdf`);
    } catch {
      setError('PDF 生成失败，请检查 Markdown 内容');
    } finally {
      setConverting(false);
    }
  }, [fullHtml, displayFileName]);

  const handleBatchImagePdf = useCallback(async () => {
    if (batchFiles.length === 0) return;
    setConverting(true);
    setError('');
    let ok = 0;
    for (const f of batchFiles) {
      try {
        await htmlToImagePdf(buildFullHtml(f.previewHtml, f.name), `${f.name}.pdf`);
        ok++;
      } catch {
        // 单个文件失败不影响后续
      }
    }
    setConverting(false);
    if (ok < batchFiles.length) {
      setError(`${ok}/${batchFiles.length} 个文件转换成功，${batchFiles.length - ok} 个失败`);
    }
  }, [batchFiles]);

  // ─── MD → 浏览器原生打印 PDF（质量最高；需手动在打印框确认「另存为 PDF」，批量需逐个确认） ───
  const handlePrintPdf = useCallback(async () => {
    if (!fullHtml) return;
    setError('');
    try {
      await printHtmlToPdf(fullHtml);
    } catch {
      setError('打印失败，请检查浏览器是否允许打印');
    }
  }, [fullHtml]);

  const handleBatchPrintPdf = useCallback(async () => {
    if (batchFiles.length === 0) return;
    setError('');
    for (const f of batchFiles) {
      try {
        await printHtmlToPdf(buildFullHtml(f.previewHtml, f.name));
      } catch {
        // 单个文件失败不影响后续
      }
    }
  }, [batchFiles]);

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
          ✏️ 粘贴 Markdown
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
                {...dropProps}
                onClick={handleReupload}
                className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-[#fb6400] bg-[#fb6400]/10'
                    : 'border-white/20 hover:border-[#fb6400]/50 hover:bg-white/5'
                }`}
              >
                <div className="text-3xl mb-2">📂</div>
                <p className="text-white/50 text-sm">
                  {isDragging ? '释放文件到这里' : '点击选择多个 .md 文件，或拖拽，或按 Ctrl+V 粘贴'}
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
                    </div>
                  ))}
                </div>
              </>
            )
          ) : (
            // ── Paste / Upload ──
            <>
              {hasContent ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-white">
                      {mode === 'upload' ? '📄 Markdown 文件' : '✏️ Markdown 源码'}
                    </h2>
                    <div className="flex items-center gap-3">
                      {mode === 'upload' && (
                        <button
                          onClick={handleReupload}
                          className="text-xs text-white/40 hover:text-[#fb6400] transition-colors"
                        >
                          重新选择
                        </button>
                      )}
                      <button
                        onClick={handleClear}
                        className="text-xs text-white/40 hover:text-[#fb6400] transition-colors"
                      >
                        清空
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={markdown}
                    onChange={(e) => setMarkdown(e.target.value)}
                    placeholder="在此输入或粘贴 Markdown 代码..."
                    className="flex-1 w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#fb6400] transition-all resize-none font-mono leading-relaxed"
                  />
                </>
              ) : mode === 'upload' ? (
                <div
                  {...dropProps}
                  onClick={handleReupload}
                  className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-[#fb6400] bg-[#fb6400]/10'
                      : 'border-white/20 hover:border-[#fb6400]/50 hover:bg-white/5'
                  }`}
                >
                  <div className="text-3xl mb-2">📄</div>
                  <p className="text-white/50 text-sm">
                    {isDragging ? '释放文件到这里' : '点击选择 .md 文件，或拖拽，或按 Ctrl+V 粘贴'}
                  </p>
                  <p className="text-white/30 text-xs mt-1">支持 .md、.markdown 格式</p>
                </div>
              ) : (
                <textarea
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  placeholder="在此输入或粘贴 Markdown 代码..."
                  className="flex-1 w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#fb6400] transition-all resize-none font-mono leading-relaxed"
                />
              )}
            </>
          )}
        </div>

        {/* RIGHT: Preview */}
        <div className="glass-card p-4 flex flex-col min-h-[400px] md:min-h-[500px]">
          <h2 className="text-sm font-semibold text-white mb-3">👁️ 预览</h2>
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
              <div className="text-2xl">📄</div>
              <p>
                {mode === 'batch'
                  ? '在左侧选择一个文件进行预览'
                  : '输入 Markdown 后将显示预览效果'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Bar */}
      {mode === 'batch' && batchFiles.length > 0 ? (
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <button
            onClick={handleBatchDownload}
            className="flex-1 py-3 bg-white/10 text-white/80 rounded-xl hover:bg-white/20 transition-all text-sm font-medium flex items-center justify-center gap-2"
          >
            📦 批量下载 HTML
          </button>
          <button
            onClick={handleBatchPdf}
            disabled={converting}
            className="flex-1 py-3 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {converting ? '⏳ 转换中…' : '📄 批量转 PDF（文字）'}
          </button>
          <button
            onClick={handleBatchImagePdf}
            disabled={converting}
            className="flex-1 py-3 bg-white/10 text-white/80 rounded-xl hover:bg-white/20 transition-all text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {converting ? '⏳ 转换中…' : '🖼️ 批量转 PDF（图片）'}
          </button>
          <button
            onClick={handleBatchPrintPdf}
            className="flex-1 py-3 bg-white/10 text-white/80 rounded-xl hover:bg-white/20 transition-all text-sm font-medium flex items-center justify-center gap-2"
          >
            🖨️ 批量打印 PDF
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
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <button
            onClick={handleCopyHtml}
            className="flex-1 py-3 bg-white/10 text-white/80 rounded-xl hover:bg-white/20 transition-all text-sm font-medium flex items-center justify-center gap-2"
          >
            {copied ? '✅ 已复制到剪贴板' : '📋 复制 HTML 代码'}
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 py-3 bg-white/10 text-white/80 rounded-xl hover:bg-white/20 transition-all text-sm font-medium flex items-center justify-center gap-2"
          >
            ⬇ 下载 HTML 文件
          </button>
          <button
            onClick={() => handleDownloadPdf()}
            disabled={converting}
            className="flex-1 py-3 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {converting ? '⏳ 转换中…' : '📄 下载 PDF（文字）'}
          </button>
          <button
            onClick={handleDownloadImagePdf}
            disabled={converting}
            className="flex-1 py-3 bg-white/10 text-white/80 rounded-xl hover:bg-white/20 transition-all text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {converting ? '⏳ 转换中…' : '🖼️ 下载 PDF（图片）'}
          </button>
          <button
            onClick={handlePrintPdf}
            className="flex-1 py-3 bg-white/10 text-white/80 rounded-xl hover:bg-white/20 transition-all text-sm font-medium flex items-center justify-center gap-2"
          >
            🖨️ 打印 PDF
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
  const [mode, setMode] = useState<'paste' | 'upload' | 'batch'>('upload');
  const [error, setError] = useState('');
  const [mdCopied, setMdCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Single upload
  const [htmlContent, setHtmlContent] = useState('');
  const [htmlFileName, setHtmlFileName] = useState('document');

  // Batch
  const [batchFiles, setBatchFiles] = useState<BatchHtmlFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const replaceModeRef = useRef(false);
  const [converting, setConverting] = useState(false);

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

  // ── Convert HTML to text-based PDF (turndown → md2pdf pipeline) ──
  const handleConvertToPdf = useCallback(async (htmlToConvert?: string) => {
    const html = htmlToConvert ?? currentHtml;
    if (!html.trim()) return;

    setConverting(true);
    setError('');

    try {
      await htmlToPdf(html, `${currentName}.pdf`);
    } catch {
      setError('PDF 生成失败，请检查 HTML 内容是否正确');
    } finally {
      setConverting(false);
    }
  }, [currentHtml, currentName]);

  // ── HTML → 图片型 PDF（html2canvas + jsPDF，所见即所得、文字不可搜索） ──
  const handleConvertToImagePdf = useCallback(async (htmlToConvert?: string) => {
    const html = htmlToConvert ?? currentHtml;
    if (!html.trim()) return;

    setConverting(true);
    setError('');

    try {
      await htmlToImagePdf(html, `${currentName}.pdf`);
    } catch {
      setError('PDF 生成失败，请检查 HTML 内容是否正确');
    } finally {
      setConverting(false);
    }
  }, [currentHtml, currentName]);

  // ── Batch convert all files one by one ──
  const handleBatchConvert = useCallback(async () => {
    if (batchFiles.length === 0) return;
    setConverting(true);
    setError('');

    let converted = 0;

    for (let i = 0; i < batchFiles.length; i++) {
      const f = batchFiles[i];

      try {
        await htmlToPdf(f.rawHtml, `${f.name}.pdf`);
        converted++;
      } catch {
        // 单个文件失败不影响后续
      }
    }

    setConverting(false);
    if (converted < batchFiles.length) {
      setError(`${converted}/${batchFiles.length} 个文件转换成功，${batchFiles.length - converted} 个失败`);
    }
  }, [batchFiles]);

  // ── Batch convert to image PDF (html2canvas + jsPDF) ──
  const handleBatchImageConvert = useCallback(async () => {
    if (batchFiles.length === 0) return;
    setConverting(true);
    setError('');

    let converted = 0;

    for (let i = 0; i < batchFiles.length; i++) {
      const f = batchFiles[i];

      try {
        await htmlToImagePdf(f.rawHtml, `${f.name}.pdf`);
        converted++;
      } catch {
        // 单个文件失败不影响后续
      }
    }

    setConverting(false);
    if (converted < batchFiles.length) {
      setError(`${converted}/${batchFiles.length} 个文件转换成功，${batchFiles.length - converted} 个失败`);
    }
  }, [batchFiles]);

  // ── HTML → 浏览器原生打印 PDF（质量最高；需手动在打印框确认「另存为 PDF」，批量需逐个确认） ──
  const handlePrintPdf = useCallback(async () => {
    if (!currentHtml.trim()) return;
    setError('');
    try {
      await printHtmlToPdf(currentHtml);
    } catch {
      setError('打印失败，请检查浏览器是否允许打印');
    }
  }, [currentHtml]);

  const handleBatchPrintPdf = useCallback(async () => {
    if (batchFiles.length === 0) return;
    setError('');
    for (const f of batchFiles) {
      try {
        await printHtmlToPdf(f.rawHtml);
      } catch {
        // 单个文件失败不影响后续
      }
    }
  }, [batchFiles]);

  // Drag/drop handlers
  const { isDragging, dropProps } = useFileUpload({
    onFiles: (files) => {
      if (mode === 'batch') {
        processBatchFiles(files);
      } else if (files[0]) {
        processFile(files[0]);
      }
    },
    accept: '.html,.htm,text/html',
    onReject: setError,
  });

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

  const handleModeChange = useCallback((newMode: 'paste' | 'upload' | 'batch') => {
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

  // HTML → Markdown（复用 getTurndown，与 PDF 转换同一份配置）
  const htmlToMd = useCallback(async (html: string) => {
    const td = await getTurndown();
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    return td.turndown(parsed.body?.innerHTML ?? html);
  }, []);

  const handleCopyMd = useCallback(async () => {
    if (!currentHtml.trim()) return;
    try {
      const md = await htmlToMd(currentHtml);
      await navigator.clipboard.writeText(md);
      setMdCopied(true);
      setTimeout(() => setMdCopied(false), 2000);
    } catch {
      setError('复制失败，请检查浏览器权限');
    }
  }, [currentHtml, htmlToMd]);

  const handleDownloadMd = useCallback(async () => {
    if (!currentHtml.trim()) return;
    try {
      const md = await htmlToMd(currentHtml);
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentName || 'document'}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError('Markdown 转换失败');
    }
  }, [currentHtml, currentName, htmlToMd]);

  const handleBatchMd = useCallback(async () => {
    if (batchFiles.length === 0) return;
    setConverting(true);
    setError('');
    let ok = 0;
    for (let i = 0; i < batchFiles.length; i++) {
      const f = batchFiles[i];
      if (i > 0) await new Promise(r => setTimeout(r, 300)); // 间隔触发避免浏览器拦截
      try {
        const md = await htmlToMd(f.rawHtml);
        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${f.name}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        ok++;
      } catch {
        // 单个文件失败不影响后续
      }
    }
    setConverting(false);
    if (ok < batchFiles.length) {
      setError(`${ok}/${batchFiles.length} 个文件转换成功，${batchFiles.length - ok} 个失败`);
    }
  }, [batchFiles, htmlToMd]);

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
          ✏️ 粘贴 HTML
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
                {...dropProps}
                onClick={handleReupload}
                className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-[#fb6400] bg-[#fb6400]/10'
                    : 'border-white/20 hover:border-[#fb6400]/50 hover:bg-white/5'
                }`}
              >
                <div className="text-3xl mb-2">📂</div>
                <p className="text-white/50 text-sm">
                  {isDragging ? '释放文件到这里' : '点击选择多个 .html 文件，或拖拽，或按 Ctrl+V 粘贴'}
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
            // ── Paste / Upload ──
            <>
              {hasContent ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-white">
                      {mode === 'upload' ? '📄 HTML 文件' : '✏️ HTML 源码'}
                    </h2>
                    <div className="flex items-center gap-3">
                      {mode === 'upload' && (
                        <button
                          onClick={handleReupload}
                          className="text-xs text-white/40 hover:text-[#fb6400] transition-colors"
                        >
                          重新选择
                        </button>
                      )}
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
                    placeholder="在此输入或粘贴 HTML 代码..."
                    className="flex-1 w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#fb6400] transition-all resize-none font-mono leading-relaxed"
                  />
                </>
              ) : mode === 'upload' ? (
                <div
                  {...dropProps}
                  onClick={handleReupload}
                  className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-[#fb6400] bg-[#fb6400]/10'
                      : 'border-white/20 hover:border-[#fb6400]/50 hover:bg-white/5'
                  }`}
                >
                  <div className="text-3xl mb-2">📄</div>
                  <p className="text-white/50 text-sm">
                    {isDragging ? '释放文件到这里' : '点击选择 .html 文件，或拖拽，或按 Ctrl+V 粘贴'}
                  </p>
                  <p className="text-white/30 text-xs mt-1">支持 .html、.htm 格式</p>
                </div>
              ) : (
                <textarea
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  placeholder="在此输入或粘贴 HTML 代码..."
                  className="flex-1 w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#fb6400] transition-all resize-none font-mono leading-relaxed"
                />
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
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <button
            onClick={handleBatchConvert}
            disabled={converting}
            className="flex-1 py-3 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {converting ? '⏳ 转换中…' : '📄 批量转 PDF（文字）'}
          </button>
          <button
            onClick={handleBatchImageConvert}
            disabled={converting}
            className="flex-1 py-3 bg-white/10 text-white/80 rounded-xl hover:bg-white/20 transition-all text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {converting ? '⏳ 转换中…' : '🖼️ 批量转 PDF（图片）'}
          </button>
          <button
            onClick={handleBatchPrintPdf}
            className="flex-1 py-3 bg-white/10 text-white/80 rounded-xl hover:bg-white/20 transition-all text-sm font-medium flex items-center justify-center gap-2"
          >
            🖨️ 批量打印 PDF
          </button>
          <button
            onClick={handleBatchMd}
            disabled={converting}
            className="flex-1 py-3 bg-white/10 text-white/80 rounded-xl hover:bg-white/20 transition-all text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {converting ? '⏳ 转换中…' : `📦 批量转 MD（${batchFiles.length} 个文件）`}
          </button>
          {currentBatchFile && (
            <button
              onClick={() => handleConvertToPdf()}
              disabled={converting}
              className="flex-1 py-3 bg-white/10 text-white/80 rounded-xl hover:bg-white/20 transition-all text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ⬇ 下载 {currentBatchFile.name}.pdf
            </button>
          )}
        </div>
      ) : hasContent && (
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <button
            onClick={() => handleConvertToPdf()}
            disabled={converting}
            className="flex-1 py-3 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {converting ? '⏳ 转换中…' : '📄 下载 PDF（文字）'}
          </button>
          <button
            onClick={() => handleConvertToImagePdf()}
            disabled={converting}
            className="flex-1 py-3 bg-white/10 text-white/80 rounded-xl hover:bg-white/20 transition-all text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {converting ? '⏳ 转换中…' : '🖼️ 下载 PDF（图片）'}
          </button>
          <button
            onClick={handlePrintPdf}
            className="flex-1 py-3 bg-white/10 text-white/80 rounded-xl hover:bg-white/20 transition-all text-sm font-medium flex items-center justify-center gap-2"
          >
            🖨️ 打印 PDF
          </button>
          <button
            onClick={handleCopyMd}
            className="flex-1 py-3 bg-white/10 text-white/80 rounded-xl hover:bg-white/20 transition-all text-sm font-medium flex items-center justify-center gap-2"
          >
            {mdCopied ? '✅ 已复制' : '📋 复制 Markdown'}
          </button>
          <button
            onClick={handleDownloadMd}
            className="flex-1 py-3 bg-white/10 text-white/80 rounded-xl hover:bg-white/20 transition-all text-sm font-medium flex items-center justify-center gap-2"
          >
            ⬇ 下载 Markdown
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