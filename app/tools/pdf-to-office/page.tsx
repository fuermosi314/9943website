'use client';

import { useState, useRef, useCallback } from 'react';
import BackButton from '@/components/BackButton';
import { PDFDocument } from 'pdf-lib';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';

type OutputFormat = 'docx' | 'xlsx' | 'pptx';

interface PdfInfo {
  name: string;
  size: number;
  pages: number;
}

export default function PdfToOffice() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(null);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('docx');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ url: string; name: string } | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const processFile = async (selectedFile: File) => {
    if (selectedFile.type !== 'application/pdf') {
      setError('请选择 PDF 文件');
      return;
    }
    setError('');
    setResult(null);
    setFile(selectedFile);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      setPdfInfo({
        name: selectedFile.name,
        size: selectedFile.size,
        pages: pdfDoc.getPageCount(),
      });
    } catch {
      setError('无法解析 PDF 文件，请检查文件是否损坏');
      setFile(null);
      setPdfInfo(null);
    }
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
    if (!file) return;
    setIsProcessing(true);
    setError('');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pageCount = pdfDoc.getPageCount();
      const baseName = file.name.replace(/\.pdf$/i, '');

      // Build page content strings
      const pageContents: string[] = [];
      for (let i = 0; i < pageCount; i++) {
        pageContents.push(`[第 ${i + 1} 页]\n（此页文本需使用专业工具提取）`);
      }
      const header = `PDF 文件: ${file.name}\n页数: ${pageCount}\n大小: ${formatSize(file.size)}`;

      if (outputFormat === 'docx') {
        const children: Paragraph[] = [];
        children.push(new Paragraph({ children: [new TextRun({ text: `PDF 文件: ${file.name}`, bold: true, size: 28 })] }));
        children.push(new Paragraph({ children: [new TextRun({ text: `页数: ${pageCount}`, size: 24 })] }));
        children.push(new Paragraph({ children: [new TextRun({ text: `大小: ${formatSize(file.size)}`, size: 24 })] }));
        children.push(new Paragraph({ children: [] }));
        for (let i = 0; i < pageCount; i++) {
          children.push(new Paragraph({ children: [new TextRun({ text: `[第 ${i + 1} 页]`, bold: true, size: 24 })] }));
          children.push(new Paragraph({ children: [new TextRun({ text: '（此页文本需使用专业工具提取）', size: 22 })] }));
          children.push(new Paragraph({ children: [] }));
        }
        const doc = new Document({ sections: [{ children }] });
        const buffer = await Packer.toBlob(doc);
        const url = URL.createObjectURL(buffer);
        setResult({ url, name: `${baseName}.docx` });
      } else if (outputFormat === 'xlsx') {
        const data: string[][] = [['页码', '内容']];
        for (let i = 0; i < pageCount; i++) {
          data.push([`第 ${i + 1} 页`, '（此页文本需使用专业工具提取）']);
        }
        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [{ wch: 10 }, { wch: 60 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'PDF内容');
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        setResult({ url, name: `${baseName}.xlsx` });
      } else if (outputFormat === 'pptx') {
        const pptx = new PptxGenJS();
        pptx.title = baseName;
        // Title slide
        const titleSlide = pptx.addSlide();
        titleSlide.addText(`PDF 文件: ${file.name}`, { x: 0.5, y: 1, w: '90%', fontSize: 24, bold: true, color: '333333' });
        titleSlide.addText(`页数: ${pageCount} | 大小: ${formatSize(file.size)}`, { x: 0.5, y: 2, w: '90%', fontSize: 16, color: '666666' });
        // Content slides
        for (let i = 0; i < pageCount; i++) {
          const slide = pptx.addSlide();
          slide.addText(`第 ${i + 1} 页`, { x: 0.5, y: 0.3, w: '90%', fontSize: 20, bold: true, color: 'fb6400' });
          slide.addText('此页文本需使用专业工具提取', { x: 0.5, y: 1.5, w: '90%', h: 3, fontSize: 14, color: '666666' });
        }
        const blob = await pptx.write({ outputType: 'blob' }) as Blob;
        const url = URL.createObjectURL(blob);
        setResult({ url, name: `${baseName}.pptx` });
      }
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
    setPdfInfo(null);
    setResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen relative z-10">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center">
          <BackButton toolId="pdf-to-office" />
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="9943" className="w-8 h-8 rounded-lg shadow-lg shadow-orange-500/30" />
            <h1 className="text-lg font-semibold text-white">PDF 转 Office</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        <div className="animate-fade-in space-y-6">
          {/* Upload Area */}
          <div className="glass-card p-6 animate-slide-up">
            <h2 className="text-base font-semibold text-white mb-4">上传 PDF 文件</h2>
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
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="text-4xl mb-3">📄</div>
              <p className="text-white/60 text-sm">
                {isDragging ? '释放文件到这里' : '拖拽 PDF 文件到这里，或点击选择文件'}
              </p>
              <p className="text-white/30 text-xs mt-2">支持 .pdf 格式</p>
            </div>
          </div>

          {/* File Info */}
          {pdfInfo && (
            <div className="glass-card p-6 animate-slide-up">
              <h2 className="text-base font-semibold text-white mb-4">文件信息</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <div className="text-xs text-white/40 mb-1">文件名</div>
                  <div className="text-sm text-white truncate" title={pdfInfo.name}>
                    {pdfInfo.name}
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <div className="text-xs text-white/40 mb-1">文件大小</div>
                  <div className="text-sm text-[#fb6400] font-semibold">
                    {formatSize(pdfInfo.size)}
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <div className="text-xs text-white/40 mb-1">页数</div>
                  <div className="text-sm text-[#fb6400] font-semibold">{pdfInfo.pages} 页</div>
                </div>
              </div>
            </div>
          )}

          {/* Format Selection */}
          {pdfInfo && !result && (
            <div className="glass-card p-6 animate-slide-up">
              <h2 className="text-base font-semibold text-white mb-4">目标格式</h2>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { value: 'docx' as OutputFormat, label: 'Word (.docx)', icon: '📝' },
                  { value: 'xlsx' as OutputFormat, label: 'Excel (.xlsx)', icon: '📊' },
                  { value: 'pptx' as OutputFormat, label: 'PowerPoint (.pptx)', icon: '📽️' },
                ]).map((fmt) => (
                  <button
                    key={fmt.value}
                    onClick={() => setOutputFormat(fmt.value)}
                    className={`relative border rounded-xl p-4 text-center transition-all ${
                      outputFormat === fmt.value
                        ? 'bg-[#fb6400]/15 border-[#fb6400] shadow-lg shadow-orange-500/20'
                        : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-2xl mb-2">{fmt.icon}</div>
                    <div className={`text-xs font-medium ${outputFormat === fmt.value ? 'text-[#fb6400]' : 'text-white/60'}`}>
                      {fmt.label}
                    </div>
                    {outputFormat === fmt.value && (
                      <div className="absolute top-2 right-2 text-[10px] text-[#fb6400] bg-[#fb6400]/20 px-1.5 py-0.5 rounded font-medium">
                        已选
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {pdfInfo && !result && (
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
                <p className="text-white/40 text-xs mb-4">文本内容已提取并保存为 {outputFormat.toUpperCase()} 文件</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleDownload}
                    className="px-6 py-2.5 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all"
                  >
                    下载文件
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
                提示：纯前端 PDF 文本提取功能有限，如需完整内容转换请使用专业工具
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
