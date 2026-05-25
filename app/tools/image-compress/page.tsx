'use client';

import { useState, useRef, useCallback } from 'react';
import BackButton from '@/components/BackButton';

export default function ImageCompress() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [quality, setQuality] = useState(80);
  const [compressed, setCompressed] = useState<string>('');
  const [compressedSize, setCompressedSize] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    setCompressed('');
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
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
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      processFile(droppedFile);
    }
  }, []);

  const handleCompress = () => {
    if (!preview) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality / 100);
      setCompressed(compressedDataUrl);

      const byteString = atob(compressedDataUrl.split(',')[1]);
      setCompressedSize(byteString.length);
    };
    img.src = preview;
  };

  const handleDownload = () => {
    if (!compressed || !file) return;

    const link = document.createElement('a');
    link.href = compressed;
    link.download = `compressed_${file.name}`;
    link.click();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="min-h-screen relative z-10">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center">
          <BackButton toolId="image-compress" />
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#fb6400] to-[#ff8c00] rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/30">
              <span className="text-white text-sm">📷</span>
            </div>
            <h1 className="text-lg font-semibold text-white">图片压缩</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        <div className="animate-fade-in">
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
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {preview ? (
              <div className="p-4">
                <img
                  src={preview}
                  alt="预览"
                  className="max-h-64 mx-auto rounded-xl shadow-2xl"
                />
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                  <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-white/70 font-medium mb-1">点击或拖拽上传图片</p>
                <p className="text-sm text-white/40">支持 JPG、PNG、WebP 格式</p>
              </div>
            )}
          </div>

          {/* Compression Settings */}
          {file && (
            <div className="mt-6 glass-card p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-white/70">压缩质量</span>
                <span className="text-sm text-white/50">
                  原始大小: {formatSize(file.size)}
                </span>
              </div>

              <div className="relative mb-6">
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#fb6400]"
                />
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-white/40">低质量</span>
                  <span className="text-sm font-medium text-[#fb6400]">{quality}%</span>
                  <span className="text-xs text-white/40">高质量</span>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleCompress}
                  className="flex-1 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white py-3 rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all font-medium"
                >
                  开始压缩
                </button>
                <button
                  onClick={() => {
                    setFile(null);
                    setPreview('');
                    setCompressed('');
                  }}
                  className="px-6 py-3 border border-white/20 rounded-xl hover:bg-white/10 transition-colors text-white/70"
                >
                  重置
                </button>
              </div>
            </div>
          )}

          {/* Result */}
          {compressed && (
            <div className="mt-6 glass-card p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="font-medium text-white">压缩完成</span>
                </div>
                <span className="text-sm text-white/50">
                  压缩后: {formatSize(compressedSize)} · 节省 {((1 - compressedSize / file!.size) * 100).toFixed(1)}%
                </span>
              </div>

              <img
                src={compressed}
                alt="压缩后"
                className="max-h-64 mx-auto rounded-xl shadow-2xl mb-6"
              />

              <button
                onClick={handleDownload}
                className="w-full bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white py-3 rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all font-medium"
              >
                下载压缩图片
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
