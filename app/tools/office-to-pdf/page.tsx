'use client';

import { useState, useRef, useCallback } from 'react';
import BackButton from '@/components/BackButton';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

type OfficeType = 'docx' | 'xlsx' | 'pptx';

interface FileInfo {
  name: string;
  size: number;
  type: OfficeType;
}

const ACCEPT_MAP: Record<OfficeType, string> = {
  docx: '.docx',
  xlsx: '.xlsx',
  pptx: '.pptx',
};

const TYPE_LABELS: Record<OfficeType, string> = {
  docx: 'Word 文档',
  xlsx: 'Excel 表格',
  pptx: 'PPT 演示文稿',
};

function detectType(file: File): OfficeType | null {
  const name = file.name.toLowerCase();
  if (name.endsWith('.docx')) return 'docx';
  if (name.endsWith('.xlsx')) return 'xlsx';
  if (name.endsWith('.pptx')) return 'pptx';
  return null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/**
 * 简易文本提取：将 ArrayBuffer 当作 UTF-8 文本读取，过滤不可见字符。
 * 这对 .docx/.xlsx/.pptx（本质是 ZIP+XML）只能提取到 XML 标签中的部分可读文本。
 */
function extractReadableText(buffer: ArrayBuffer): string {
  const uint8 = new Uint8Array(buffer);
  // XML-based Office files are ZIP archives; extract printable ASCII/UTF-8 runs
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const raw = decoder.decode(uint8);
  // Match sequences of 3+ printable characters (including CJK)
  const matches = raw.match(/[\x20-\x7E一-鿿　-〿＀-￯]{3,}/g);
  if (!matches) return '';
  // Deduplicate consecutive duplicates and join
  const seen = new Set<string>();
  const result: string[] = [];
  for (const m of matches) {
    const trimmed = m.trim();
    if (trimmed.length >= 3 && !seen.has(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);
    }
  }
  return result.join('\n');
}

export default function OfficeToPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ url: string; name: string } | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (selectedFile: File) => {
    const type = detectType(selectedFile);
    if (!type) {
      setError('请选择 Office 文件（.docx、.xlsx、.pptx）');
      return;
    }
    setError('');
    setResult(null);
    setFile(selectedFile);
    setFileInfo({
      name: selectedFile.name,
      size: selectedFile.size,
      type,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
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
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) processFile(droppedFile);
  }, []);

  const handleConvert = async () => {
    if (!file || !fileInfo) return;
    setIsProcessing(true);
    setError('');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const text = extractReadableText(arrayBuffer);

      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontSize = 11;
      const lineHeight = 14;
      const margin = 50;
      const pageWidth = 595.28; // A4
      const pageHeight = 841.89;
      const textWidth = pageWidth - margin * 2;
      const textHeight = pageHeight - margin * 2;

      // Header info
      const headerLines = [
        `File: ${file.name}`,
        `Type: ${TYPE_LABELS[fileInfo.type]}`,
        `Size: ${formatSize(fileInfo.size)}`,
        '',
        '--- Extracted Text ---',
        '',
      ];

      const allLines = [
        ...headerLines,
        ...(text
          ? text.split('\n').flatMap((line) => {
              // Word-wrap long lines
              const wrapped: string[] = [];
              let remaining = line;
              while (remaining.length > 0) {
                let cut = remaining.length;
                while (cut > 0 && font.widthOfTextAtSize(remaining.substring(0, cut), fontSize) > textWidth) {
                  cut--;
                }
                if (cut === 0) cut = 1;
                wrapped.push(remaining.substring(0, cut));
                remaining = remaining.substring(cut);
              }
              return wrapped;
            })
          : ['(No readable text extracted)']),
      ];

      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      let y = pageHeight - margin;
      let pageNum = 1;

      for (const line of allLines) {
        if (y - lineHeight < margin) {
          // Add page number
          page.drawText(`Page ${pageNum}`, {
            x: pageWidth / 2 - 20,
            y: 30,
            size: 9,
            font,
            color: rgb(0.5, 0.5, 0.5),
          });
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
          pageNum++;
        }
        // Encode only ASCII-safe characters for Helvetica
        const safeText = line.replace(/[^\x20-\x7E]/g, '?');
        page.drawText(safeText, {
          x: margin,
          y,
          size: fontSize,
          font,
          color: rgb(0.1, 0.1, 0.1),
        });
        y -= lineHeight;
      }

      // Page number on last page
      page.drawText(`Page ${pageNum}`, {
        x: pageWidth / 2 - 20,
        y: 30,
        size: 9,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const baseName = file.name.replace(/\.(docx|xlsx|pptx)$/i, '');
      setResult({ url, name: `${baseName}.pdf` });
    } catch {
      setError('转换失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result.url;
    link.download = result.name;
    link.click();
  };

  const handleReset = () => {
    if (result) URL.revokeObjectURL(result.url);
    setFile(null);
    setFileInfo(null);
    setResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const acceptStr = Object.values(ACCEPT_MAP).join(',');

  return (
    <div className="min-h-screen relative z-10">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center">
          <BackButton toolId="office-to-pdf" />
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#fb6400] to-[#ff8c00] rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/30">
              <span className="text-white text-sm">📑</span>
            </div>
            <h1 className="text-lg font-semibold text-white">Office 转 PDF</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        <div className="animate-fade-in space-y-6">
          {/* Upload Area */}
          <div className="glass-card p-6 animate-slide-up">
            <h2 className="text-base font-semibold text-white mb-4">上传 Office 文件</h2>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-[#fb6400] bg-[#fb6400]/10'
                  : 'border-white/20 hover:border-[#fb6400]/50 hover:bg-white/5'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptStr}
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="text-4xl mb-3">📑</div>
              <p className="text-white/60 text-sm">
                {isDragging ? '释放文件到这里' : '拖拽 Office 文件到这里，或点击选择文件'}
              </p>
              <p className="text-white/30 text-xs mt-2">支持 .docx、.xlsx、.pptx 格式</p>
            </div>
          </div>

          {/* File Info */}
          {fileInfo && (
            <div className="glass-card p-6 animate-slide-up">
              <h2 className="text-base font-semibold text-white mb-4">文件信息</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <div className="text-xs text-white/40 mb-1">文件名</div>
                  <div className="text-sm text-white truncate" title={fileInfo.name}>
                    {fileInfo.name}
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <div className="text-xs text-white/40 mb-1">文件大小</div>
                  <div className="text-sm text-[#fb6400] font-semibold">
                    {formatSize(fileInfo.size)}
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <div className="text-xs text-white/40 mb-1">文件类型</div>
                  <div className="text-sm text-[#fb6400] font-semibold">
                    {TYPE_LABELS[fileInfo.type]}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {fileInfo && !result && (
            <div className="flex gap-3 animate-slide-up">
              <button
                onClick={handleConvert}
                disabled={isProcessing}
                className="flex-1 py-3 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white font-medium rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    转换中...
                  </span>
                ) : (
                  '开始转换'
                )}
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-3 bg-white/10 text-white/60 rounded-xl hover:bg-white/20 transition-all"
              >
                重新选择
              </button>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="glass-card p-6 animate-slide-up">
              <h2 className="text-base font-semibold text-white mb-4">转换完成</h2>
              <div className="bg-white/5 rounded-xl p-6 text-center">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-white text-sm mb-1">{result.name}</p>
                <p className="text-white/40 text-xs mb-4">文本内容已提取并保存为 PDF 文件</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleDownload}
                    className="px-6 py-2.5 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all"
                  >
                    下载 PDF
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-6 py-2.5 bg-white/10 text-white/60 text-sm rounded-xl hover:bg-white/20 transition-all"
                  >
                    转换其他文件
                  </button>
                </div>
              </div>
              <p className="text-xs text-white/30 mt-3 text-center">
                提示：纯前端 Office 转 PDF 功能有限，仅提取文本内容，如需完整转换请使用专业工具
              </p>
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
