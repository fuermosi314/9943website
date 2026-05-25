'use client';

import { useState, useRef, useCallback } from 'react';
import BackButton from '@/components/BackButton';
import { PDFDocument } from 'pdf-lib';

interface PdfFile {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number;
}

export default function PdfMerge() {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getPdfPageCount = async (file: File): Promise<number> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      return pdfDoc.getPageCount();
    } catch {
      return 0;
    }
  };

  const processFiles = async (selectedFiles: FileList | File[]) => {
    const newFiles: PdfFile[] = [];

    for (const file of Array.from(selectedFiles)) {
      if (file.type === 'application/pdf') {
        const pageCount = await getPdfPageCount(file);
        newFiles.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          name: file.name,
          size: file.size,
          pageCount,
        });
      }
    }

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
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
    processFiles(e.dataTransfer.files);
  }, []);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOverItem = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFiles = [...files];
    const [removed] = newFiles.splice(draggedIndex, 1);
    newFiles.splice(index, 0, removed);
    setFiles(newFiles);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleMerge = async () => {
    if (files.length < 2) return;

    setIsMerging(true);
    try {
      const mergedPdf = await PDFDocument.create();

      for (const pdfFile of files) {
        const arrayBuffer = await pdfFile.file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = 'merged.pdf';
      link.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Merge failed:', error);
      setError('合并失败，请确保所有文件都是有效的 PDF');
    } finally {
      setIsMerging(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const totalPages = files.reduce((sum, f) => sum + f.pageCount, 0);

  return (
    <div className="min-h-screen relative z-10">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center">
          <BackButton toolId="pdf-merge" />
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="9943" className="w-8 h-8 rounded-lg shadow-lg shadow-orange-500/30" />
            <h1 className="text-lg font-semibold text-white">PDF 合并</h1>
          </div>
        </div>
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
              isDragging
                ? 'border-[#fb6400] bg-[#fb6400]/10'
                : 'hover:border-white/20'
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
              multiple
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
              <p className="text-sm text-white/40">支持同时上传多个 PDF 文件</p>
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-6 glass-card p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-white/70">
                  已添加 {files.length} 个文件 · 共 {totalPages} 页
                </span>
                <button
                  onClick={() => setFiles([])}
                  className="text-sm text-white/50 hover:text-[#fb6400] transition-colors"
                >
                  清空全部
                </button>
              </div>

              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={file.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOverItem(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center p-3 rounded-xl bg-white/5 border border-white/10 transition-all cursor-move ${
                      draggedIndex === index ? 'opacity-50 scale-95' : 'hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <svg className="w-5 h-5 text-white/40 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{file.name}</p>
                        <p className="text-xs text-white/40">
                          {formatSize(file.size)} · {file.pageCount} 页
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(file.id);
                      }}
                      className="ml-3 p-1 text-white/40 hover:text-red-400 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Merge Button */}
              <button
                onClick={handleMerge}
                disabled={files.length < 2 || isMerging}
                className={`w-full mt-6 py-3 rounded-xl font-medium transition-all ${
                  files.length < 2
                    ? 'bg-white/10 text-white/30 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white hover:shadow-lg hover:shadow-orange-500/30'
                }`}
              >
                {isMerging ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    合并中...
                  </span>
                ) : (
                  `合并 ${files.length} 个 PDF`
                )}
              </button>
            </div>
          )}

          {/* Instructions */}
          {files.length === 0 && (
            <div className="mt-6 glass-card p-6 animate-slide-up">
              <h3 className="text-sm font-medium text-white/70 mb-3">使用说明</h3>
              <ul className="space-y-2 text-sm text-white/50">
                <li className="flex items-start">
                  <span className="text-[#fb6400] mr-2">1.</span>
                  上传两个或多个 PDF 文件
                </li>
                <li className="flex items-start">
                  <span className="text-[#fb6400] mr-2">2.</span>
                  拖拽文件调整合并顺序
                </li>
                <li className="flex items-start">
                  <span className="text-[#fb6400] mr-2">3.</span>
                  点击合并按钮生成新 PDF
                </li>
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
