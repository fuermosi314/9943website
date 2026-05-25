'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function ImageResize() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [newWidth, setNewWidth] = useState<number>(0);
  const [newHeight, setNewHeight] = useState<number>(0);
  const [lockRatio, setLockRatio] = useState(true);
  const [resized, setResized] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    setResized('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height });
        setNewWidth(img.width);
        setNewHeight(img.height);
      };
      img.src = event.target?.result as string;
      setPreview(event.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
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
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      processFile(droppedFile);
    }
  }, []);

  const handleWidthChange = (value: string) => {
    const w = parseInt(value) || 0;
    setNewWidth(w);
    if (lockRatio && imageSize.width > 0) {
      setNewHeight(Math.round((w / imageSize.width) * imageSize.height));
    }
  };

  const handleHeightChange = (value: string) => {
    const h = parseInt(value) || 0;
    setNewHeight(h);
    if (lockRatio && imageSize.height > 0) {
      setNewWidth(Math.round((h / imageSize.height) * imageSize.width));
    }
  };

  const handleResize = () => {
    if (!preview || newWidth <= 0 || newHeight <= 0) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      const resizedDataUrl = canvas.toDataURL('image/png');
      setResized(resizedDataUrl);
    };
    img.src = preview;
  };

  const handleDownload = () => {
    if (!resized || !file) return;

    const link = document.createElement('a');
    link.href = resized;
    link.download = `resized_${file.name}`;
    link.click();
  };

  return (
    <div className="min-h-screen relative z-10">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center">
          <button onClick={() => router.back()} className="flex items-center text-white/60 hover:text-[#fb6400] transition-colors mr-6">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#fb6400] to-[#ff8c00] rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/30">
              <span className="text-white text-sm">📐</span>
            </div>
            <h1 className="text-lg font-semibold text-white">图片调整大小</h1>
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
                <p className="text-center text-sm text-white/50 mt-2">
                  {imageSize.width} x {imageSize.height} 像素
                </p>
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

          {/* Resize Settings */}
          {file && (
            <div className="mt-6 glass-card p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-white/70">调整大小</span>
                <span className="text-sm text-white/50">
                  原始尺寸: {imageSize.width} x {imageSize.height}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-white/50 mb-1">宽度 (px)</label>
                  <input
                    type="number"
                    value={newWidth || ''}
                    onChange={(e) => handleWidthChange(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-[#fb6400] focus:outline-none transition-colors"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/50 mb-1">高度 (px)</label>
                  <input
                    type="number"
                    value={newHeight || ''}
                    onChange={(e) => handleHeightChange(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-[#fb6400] focus:outline-none transition-colors"
                    min="1"
                  />
                </div>
              </div>

              <label className="flex items-center space-x-3 mb-6 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={lockRatio}
                    onChange={(e) => setLockRatio(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${
                      lockRatio
                        ? 'bg-[#fb6400] border-[#fb6400]'
                        : 'border-white/30 group-hover:border-white/50'
                    }`}
                  >
                    {lockRatio && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-white/70 group-hover:text-white/90 transition-colors">
                  锁定宽高比
                </span>
              </label>

              <div className="flex space-x-3">
                <button
                  onClick={handleResize}
                  disabled={newWidth <= 0 || newHeight <= 0}
                  className="flex-1 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white py-3 rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  调整大小
                </button>
                <button
                  onClick={() => {
                    setFile(null);
                    setPreview('');
                    setResized('');
                    setNewWidth(0);
                    setNewHeight(0);
                  }}
                  className="px-6 py-3 border border-white/20 rounded-xl hover:bg-white/10 transition-colors text-white/70"
                >
                  重置
                </button>
              </div>
            </div>
          )}

          {/* Result */}
          {resized && (
            <div className="mt-6 glass-card p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="font-medium text-white">调整完成</span>
                </div>
                <span className="text-sm text-white/50">
                  {newWidth} x {newHeight} 像素
                </span>
              </div>

              <img
                src={resized}
                alt="调整后"
                className="max-h-64 mx-auto rounded-xl shadow-2xl mb-6"
              />

              <button
                onClick={handleDownload}
                className="w-full bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white py-3 rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all font-medium"
              >
                下载调整后的图片
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
