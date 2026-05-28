'use client';
import { useToolHistory } from '@/lib/useToolHistory';

import { useState, useRef, useCallback } from 'react';
import BackButton from '@/components/BackButton';
import FullscreenButton from '@/components/FullscreenButton';
import { PDFDocument } from 'pdf-lib';

type CompressLevel = 'low' | 'medium' | 'high';

interface CompressOption {
  level: CompressLevel;
  label: string;
  description: string;
  objectStreams: boolean;
}

const compressOptions: CompressOption[] = [
  { level: 'low', label: '低压缩', description: '高质量，文件较大', objectStreams: false },
  { level: 'medium', label: '中等压缩', description: '平衡质量和大小', objectStreams: true },
  { level: 'high', label: '高压缩', description: '低质量，文件较小', objectStreams: true },
];

interface CompressResult {
  originalSize: number;
  compressedSize: number;
  ratio: number;
  blob: Blob;
}

export default function PdfCompress() {
  useToolHistory('pdf-compress');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<CompressLevel>('medium');
  const [isCompressing, setIsCompressing] = useState(false);
  const [result, setResult] = useState<CompressResult | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getPdfInfo = async (f: File) => {
    const arrayBuffer = await f.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
  };

  const processFile = async (f: File) => {
    if (f.type !== 'application/pdf') return;
    setFile(f);
    setFileName(f.name);
    setFileSize(f.size);
    setResult(null);
    try {
      const pages = await getPdfInfo(f);
      setPageCount(pages);
    } catch {
      setPageCount(0);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
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
    if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  }, []);

  const clearFile = () => {
    setFile(null);
    setFileName('');
    setFileSize(0);
    setPageCount(0);
    setResult(null);
  };

  const handleCompress = async () => {
    if (!file) return;
    setIsCompressing(true);
    setResult(null);

    try {
      const option = compressOptions.find((o) => o.level === selectedLevel)!;
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

      const compressedBytes = await pdfDoc.save({
        useObjectStreams: option.objectStreams,
        addDefaultPage: false,
        objectsPerTick: option.level === 'high' ? 50 : undefined,
      });

      const blob = new Blob([compressedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const ratio = ((1 - blob.size / file.size) * 100);

      setResult({
        originalSize: file.size,
        compressedSize: blob.size,
        ratio: Math.max(0, ratio),
        blob,
      });
    } catch (error) {
      console.error('Compress failed:', error);
      setError('压缩失败，请确保文件是有效的 PDF');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const link = document.createElement('a');
    link.href = url;
    const baseName = fileName.replace(/\.pdf$/i, '');
    link.download = `${baseName}_compressed.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="min-h-screen relative z-10">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl safe-area-top border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center">
          <BackButton category="document" />
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="9943" className="w-8 h-8 rounded-lg shadow-lg shadow-orange-500/30" />
            <h1 className="text-lg font-semibold text-white">PDF 压缩</h1>
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
          {!file ? (
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
          ) : (
            <div className="space-y-6 animate-slide-up">
              {/* File Info */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-white/70">文件信息</span>
                  <button
                    onClick={clearFile}
                    className="text-sm text-white/50 hover:text-[#fb6400] transition-colors"
                  >
                    换一个文件
                  </button>
                </div>
                <div className="flex items-center p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-10 h-10 bg-[#fb6400]/20 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-lg">📦</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{fileName}</p>
                    <p className="text-xs text-white/40">
                      {formatSize(fileSize)} · {pageCount} 页
                    </p>
                  </div>
                </div>
              </div>

              {/* Compress Options */}
              <div className="glass-card p-6">
                <span className="text-sm font-medium text-white/70 block mb-3">压缩级别</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {compressOptions.map((option) => (
                    <button
                      key={option.level}
                      onClick={() => setSelectedLevel(option.level)}
                      className={`p-4 rounded-xl border transition-all text-left ${
                        selectedLevel === option.level
                          ? 'border-[#fb6400] bg-[#fb6400]/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <p className={`text-sm font-medium ${
                        selectedLevel === option.level ? 'text-[#fb6400]' : 'text-white'
                      }`}>
                        {option.label}
                      </p>
                      <p className="text-xs text-white/40 mt-1">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Compress Button */}
              <button
                onClick={handleCompress}
                disabled={isCompressing}
                className="w-full py-3 rounded-xl font-medium bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white hover:shadow-lg hover:shadow-orange-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCompressing ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    压缩中...
                  </span>
                ) : (
                  '开始压缩'
                )}
              </button>

              {/* Result */}
              {result && (
                <div className="glass-card p-6 animate-slide-up">
                  <span className="text-sm font-medium text-white/70 block mb-4">压缩结果</span>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-3 rounded-xl bg-white/5">
                      <p className="text-xs text-white/40 mb-1">原始大小</p>
                      <p className="text-sm font-medium text-white">{formatSize(result.originalSize)}</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-white/5">
                      <p className="text-xs text-white/40 mb-1">压缩后</p>
                      <p className="text-sm font-medium text-[#fb6400]">{formatSize(result.compressedSize)}</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-white/5">
                      <p className="text-xs text-white/40 mb-1">压缩率</p>
                      <p className="text-sm font-medium text-green-400">
                        {result.ratio > 0 ? `-${result.ratio.toFixed(1)}%` : '0%'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleDownload}
                    className="w-full py-3 rounded-xl font-medium bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white hover:shadow-lg hover:shadow-orange-500/30 transition-all"
                  >
                    下载压缩后的 PDF
                  </button>
                </div>
              )}
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
                  选择压缩级别（低/中/高）
                </li>
                <li className="flex items-start">
                  <span className="text-[#fb6400] mr-2">3.</span>
                  点击压缩按钮，等待处理完成
                </li>
                <li className="flex items-start">
                  <span className="text-[#fb6400] mr-2">4.</span>
                  下载压缩后的 PDF 文件
                </li>
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
