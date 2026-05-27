'use client';
import { useToolHistory } from '@/lib/useToolHistory';

import { useState, useRef, useCallback } from 'react';
import BackButton from '@/components/BackButton';

type Format = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/bmp';

const FORMAT_OPTIONS: { label: string; value: Format; ext: string }[] = [
  { label: 'PNG', value: 'image/png', ext: 'png' },
  { label: 'JPG', value: 'image/jpeg', ext: 'jpg' },
  { label: 'WebP', value: 'image/webp', ext: 'webp' },
  { label: 'BMP', value: 'image/bmp', ext: 'bmp' },
];

export default function ImageConvert() {
  useToolHistory('image-convert');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [targetFormat, setTargetFormat] = useState<Format>('image/png');
  const [quality, setQuality] = useState(90);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
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
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      processFile(droppedFile);
    }
  }, []);

  const showQualitySlider = targetFormat === 'image/jpeg' || targetFormat === 'image/webp';

  const handleConvert = () => {
    if (!preview) return;
    setIsConverting(true);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsConverting(false);
        return;
      }

      // BMP 不支持透明度，用白色背景
      if (targetFormat === 'image/bmp') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);

      const exportQuality = showQualitySlider ? quality / 100 : undefined;
      const dataUrl = canvas.toDataURL(targetFormat, exportQuality);

      const ext = FORMAT_OPTIONS.find((f) => f.value === targetFormat)?.ext ?? 'png';
      const baseName = file?.name.replace(/\.[^.]+$/, '') ?? 'image';

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${baseName}.${ext}`;
      link.click();

      setIsConverting(false);
    };
    img.onerror = () => setIsConverting(false);
    img.src = preview;
  };

  const handleReset = () => {
    setFile(null);
    setPreview('');
    setTargetFormat('image/png');
    setQuality(90);
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
          <BackButton toolId="image-convert" />
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="9943" className="w-8 h-8 rounded-lg shadow-lg shadow-orange-500/30" />
            <h1 className="text-lg font-semibold text-white">图片格式转换</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        <div className="animate-fade-in">
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
                {file && (
                  <p className="text-center text-sm text-white/40 mt-3">
                    {file.name} ({formatSize(file.size)})
                  </p>
                )}
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                  <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-white/70 font-medium mb-1">点击或拖拽上传图片</p>
                <p className="text-sm text-white/40">支持 JPG、PNG、WebP、BMP 等常见图片格式</p>
              </div>
            )}
          </div>

          {/* Format Selection */}
          {file && (
            <div className="mt-6 glass-card p-6 animate-slide-up">
              <h3 className="text-sm font-medium text-white/70 mb-4">目标格式</h3>
              <div className="grid grid-cols-4 gap-3">
                {FORMAT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTargetFormat(opt.value)}
                    className={`py-3 rounded-xl text-sm font-medium transition-all ${
                      targetFormat === opt.value
                        ? 'bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white shadow-lg shadow-orange-500/30'
                        : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Quality Slider (JPG/WebP only) */}
              {showQualitySlider && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/70">输出质量</span>
                    <span className="text-sm font-medium text-[#fb6400]">{quality}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#fb6400]"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-white/40">10%</span>
                    <span className="text-xs text-white/40">100%</span>
                  </div>
                </div>
              )}

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleConvert}
                  disabled={isConverting}
                  className="flex-1 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white py-3 rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all font-medium disabled:opacity-60"
                >
                  {isConverting ? '转换中...' : '转换并下载'}
                </button>
                <button
                  onClick={handleReset}
                  className="px-6 py-3 border border-white/20 rounded-xl hover:bg-white/10 transition-colors text-white/70"
                >
                  重置
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
