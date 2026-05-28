'use client';
import { useToolHistory } from '@/lib/useToolHistory';

import { useState, useRef, useCallback } from 'react';
import BackButton from '@/components/BackButton';
import FullscreenButton from '@/components/FullscreenButton';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';

type SplitMode = 'each' | 'range' | 'count';

export default function PdfSplit() {
  useToolHistory('pdf-split');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSplitting, setIsSplitting] = useState(false);
  const [splitMode, setSplitMode] = useState<SplitMode>('each');
  const [rangeInput, setRangeInput] = useState('');
  const [splitCount, setSplitCount] = useState(2);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getPdfInfo = async (f: File) => {
    try {
      const arrayBuffer = await f.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      return pdfDoc.getPageCount();
    } catch {
      return 0;
    }
  };

  const processFile = async (selectedFile: File) => {
    if (selectedFile.type !== 'application/pdf') return;
    const count = await getPdfInfo(selectedFile);
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setFileSize(selectedFile.size);
    setPageCount(count);
    setRangeInput('');
    setSplitCount(2);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const removeFile = () => {
    setFile(null);
    setFileName('');
    setFileSize(0);
    setPageCount(0);
    setRangeInput('');
    setSplitCount(2);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const parseRanges = (input: string, total: number): number[][] => {
    const parts = input.split(',').map((s) => s.trim()).filter(Boolean);
    const ranges: number[][] = [];
    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-').map((s) => s.trim());
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (isNaN(start) || isNaN(end) || start < 1 || end > total || start > end) return [];
        const pages: number[] = [];
        for (let i = start; i <= end; i++) pages.push(i - 1);
        ranges.push(pages);
      } else {
        const num = parseInt(part, 10);
        if (isNaN(num) || num < 1 || num > total) return [];
        ranges.push([num - 1]);
      }
    }
    return ranges;
  };

  const splitByCount = (total: number, count: number): number[][] => {
    const chunkSize = Math.ceil(total / count);
    const ranges: number[][] = [];
    for (let i = 0; i < total; i += chunkSize) {
      const end = Math.min(i + chunkSize, total);
      const pages: number[] = [];
      for (let j = i; j < end; j++) pages.push(j);
      ranges.push(pages);
    }
    return ranges;
  };

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSplit = async () => {
    if (!file) return;

    setIsSplitting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const total = srcDoc.getPageCount();
      const baseName = fileName.replace(/\.pdf$/i, '');

      let pageGroups: number[][] = [];

      if (splitMode === 'each') {
        for (let i = 0; i < total; i++) pageGroups.push([i]);
      } else if (splitMode === 'range') {
        pageGroups = parseRanges(rangeInput, total);
        if (pageGroups.length === 0) {
          setError('页码范围格式错误，请检查输入');
          setIsSplitting(false);
          return;
        }
      } else {
        const count = Math.min(splitCount, total);
        pageGroups = splitByCount(total, count);
      }

      const zip = new JSZip();

      for (let g = 0; g < pageGroups.length; g++) {
        const newDoc = await PDFDocument.create();
        const indices = pageGroups[g];
        const copiedPages = await newDoc.copyPages(srcDoc, indices);
        copiedPages.forEach((p) => newDoc.addPage(p));
        const bytes = await newDoc.save();
        const suffix =
          splitMode === 'each'
            ? `_page${indices[0] + 1}`
            : splitMode === 'range'
              ? `_part${g + 1}_p${indices[0] + 1}-${indices[indices.length - 1] + 1}`
              : `_part${g + 1}`;
        zip.file(`${baseName}${suffix}.pdf`, bytes);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, `${baseName}_split.zip`);
    } catch (error) {
      console.error('Split failed:', error);
      setError('拆分失败，请确保文件是有效的 PDF');
    } finally {
      setIsSplitting(false);
    }
  };

  const canSplit = (): boolean => {
    if (!file || pageCount === 0) return false;
    if (splitMode === 'range') return rangeInput.trim().length > 0;
    if (splitMode === 'count') return splitCount >= 2 && splitCount <= pageCount;
    return true;
  };

  return (
    <div className="min-h-screen relative z-10">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl safe-area-top border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center">
          <BackButton category="document" />
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="9943" className="w-8 h-8 rounded-lg shadow-lg shadow-orange-500/30" />
            <h1 className="text-lg font-semibold text-white">PDF 拆分</h1>
          </div>
        </div>
        <FullscreenButton />
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        <div className="animate-fade-in">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
              <button onClick={() => setError('')} className="ml-2 underline">关闭</button>
            </div>
          )}
          {/* Upload Area */}
          <div
            className={`glass-card p-8 cursor-pointer transition-all duration-300 ${
              isDragging ? 'border-[#fb6400] bg-[#fb6400]/10' : 'hover:border-white/20'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-white/70 font-medium mb-1">点击或拖拽上传 PDF 文件</p>
              <p className="text-sm text-white/40">支持单个 PDF 文件</p>
            </div>
          </div>

          {/* File Info */}
          {file && (
            <div className="mt-6 glass-card p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-white/70">文件信息</span>
                <button
                  onClick={removeFile}
                  className="text-sm text-white/50 hover:text-[#fb6400] transition-colors"
                >
                  移除文件
                </button>
              </div>

              <div className="flex items-center p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center flex-1 min-w-0">
                  <svg className="w-5 h-5 text-[#fb6400] mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{fileName}</p>
                    <p className="text-xs text-white/40">{formatSize(fileSize)} · {pageCount} 页</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Split Options */}
          {file && (
            <div className="mt-6 glass-card p-6 animate-slide-up">
              <h3 className="text-sm font-medium text-white/70 mb-4">拆分模式</h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                {([
                  { key: 'each', label: '按页拆分', desc: '每页一个文件' },
                  { key: 'range', label: '按范围拆分', desc: '自定义页码范围' },
                  { key: 'count', label: '按份数拆分', desc: '指定拆分份数' },
                ] as const).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setSplitMode(opt.key)}
                    className={`p-4 rounded-xl border transition-all text-left ${
                      splitMode === opt.key
                        ? 'border-[#fb6400] bg-[#fb6400]/10'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <p className="text-sm font-medium text-white">{opt.label}</p>
                    <p className="text-xs text-white/40 mt-1">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {splitMode === 'range' && (
                <div className="animate-fade-in">
                  <label className="block text-sm text-white/60 mb-2">
                    输入页码范围（如 1-3, 5, 7-10）
                  </label>
                  <input
                    type="text"
                    value={rangeInput}
                    onChange={(e) => setRangeInput(e.target.value)}
                    placeholder="1-3, 5, 7-10"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-[#fb6400] focus:outline-none transition-colors"
                  />
                  <p className="text-xs text-white/40 mt-2">
                    用逗号分隔，支持单页（如 5）和范围（如 1-3），共 {pageCount} 页
                  </p>
                </div>
              )}

              {splitMode === 'count' && (
                <div className="animate-fade-in">
                  <label className="block text-sm text-white/60 mb-2">
                    拆分成几份（2 - {pageCount}）
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={pageCount}
                    value={splitCount}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v)) setSplitCount(v);
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-[#fb6400] focus:outline-none transition-colors"
                  />
                  <p className="text-xs text-white/40 mt-2">
                    每份约 {pageCount > 0 ? Math.ceil(pageCount / Math.min(splitCount, pageCount)) : 0} 页
                  </p>
                </div>
              )}

              <button
                onClick={handleSplit}
                disabled={!canSplit() || isSplitting}
                className={`w-full mt-6 py-3 rounded-xl font-medium transition-all ${
                  !canSplit()
                    ? 'bg-white/10 text-white/30 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white hover:shadow-lg hover:shadow-orange-500/30'
                }`}
              >
                {isSplitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    拆分中...
                  </span>
                ) : (
                  '拆分并下载'
                )}
              </button>
            </div>
          )}

          {/* Instructions */}
          {!file && (
            <div className="mt-6 glass-card p-6 animate-slide-up">
              <h3 className="text-sm font-medium text-white/70 mb-3">使用说明</h3>
              <ul className="space-y-2 text-sm text-white/50">
                <li className="flex items-start">
                  <span className="text-[#fb6400] mr-2">1.</span>
                  上传一个 PDF 文件
                </li>
                <li className="flex items-start">
                  <span className="text-[#fb6400] mr-2">2.</span>
                  选择拆分模式（按页、按范围、按份数）
                </li>
                <li className="flex items-start">
                  <span className="text-[#fb6400] mr-2">3.</span>
                  点击拆分按钮，自动下载 ZIP 压缩包
                </li>
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
