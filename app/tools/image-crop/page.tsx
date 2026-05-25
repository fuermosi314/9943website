'use client';

import { useState, useRef, useCallback } from 'react';
import BackButton from '@/components/BackButton';

export default function ImageCrop() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [cropped, setCropped] = useState<string>('');
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
    setCropped('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height });
        setCropArea({ x: 0, y: 0, width: Math.min(100, img.width), height: Math.min(100, img.height) });
      };
      img.src = event.target?.result as string;
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

  const handleCrop = () => {
    if (!preview) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = cropArea.width;
      canvas.height = cropArea.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(
        img,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        0,
        0,
        cropArea.width,
        cropArea.height
      );

      const croppedDataUrl = canvas.toDataURL('image/png');
      setCropped(croppedDataUrl);
    };
    img.src = preview;
  };

  const handleDownload = () => {
    if (!cropped || !file) return;

    const link = document.createElement('a');
    link.href = cropped;
    link.download = `cropped_${file.name}`;
    link.click();
  };

  const handleInputChange = (field: keyof typeof cropArea, value: string) => {
    const num = parseInt(value) || 0;
    setCropArea((prev) => ({ ...prev, [field]: Math.max(0, num) }));
  };

  return (
    <div className="min-h-screen relative z-10">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center">
          <BackButton toolId="image-crop" />
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#fb6400] to-[#ff8c00] rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/30">
              <span className="text-white text-sm">✂️</span>
            </div>
            <h1 className="text-lg font-semibold text-white">图片裁剪</h1>
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

          {/* Crop Settings */}
          {file && (
            <div className="mt-6 glass-card p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-white/70">裁剪区域</span>
                <span className="text-sm text-white/50">
                  原始尺寸: {imageSize.width} x {imageSize.height}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm text-white/50 mb-1">X 坐标</label>
                  <input
                    type="number"
                    value={cropArea.x}
                    onChange={(e) => handleInputChange('x', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-[#fb6400] focus:outline-none transition-colors"
                    min="0"
                    max={imageSize.width}
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/50 mb-1">Y 坐标</label>
                  <input
                    type="number"
                    value={cropArea.y}
                    onChange={(e) => handleInputChange('y', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-[#fb6400] focus:outline-none transition-colors"
                    min="0"
                    max={imageSize.height}
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/50 mb-1">宽度</label>
                  <input
                    type="number"
                    value={cropArea.width}
                    onChange={(e) => handleInputChange('width', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-[#fb6400] focus:outline-none transition-colors"
                    min="1"
                    max={imageSize.width}
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/50 mb-1">高度</label>
                  <input
                    type="number"
                    value={cropArea.height}
                    onChange={(e) => handleInputChange('height', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-[#fb6400] focus:outline-none transition-colors"
                    min="1"
                    max={imageSize.height}
                  />
                </div>
              </div>

              {/* Preview Crop Area */}
              <div className="relative mb-6 bg-white/5 rounded-xl overflow-hidden">
                <img
                  src={preview}
                  alt="裁剪预览"
                  className="w-full opacity-50"
                />
                <div
                  className="absolute border-2 border-[#fb6400] bg-[#fb6400]/20"
                  style={{
                    left: `${(cropArea.x / imageSize.width) * 100}%`,
                    top: `${(cropArea.y / imageSize.height) * 100}%`,
                    width: `${(cropArea.width / imageSize.width) * 100}%`,
                    height: `${(cropArea.height / imageSize.height) * 100}%`,
                  }}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleCrop}
                  className="flex-1 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white py-3 rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all font-medium"
                >
                  开始裁剪
                </button>
                <button
                  onClick={() => {
                    setFile(null);
                    setPreview('');
                    setCropped('');
                    setCropArea({ x: 0, y: 0, width: 100, height: 100 });
                  }}
                  className="px-6 py-3 border border-white/20 rounded-xl hover:bg-white/10 transition-colors text-white/70"
                >
                  重置
                </button>
              </div>
            </div>
          )}

          {/* Result */}
          {cropped && (
            <div className="mt-6 glass-card p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="font-medium text-white">裁剪完成</span>
                </div>
                <span className="text-sm text-white/50">
                  {cropArea.width} x {cropArea.height} 像素
                </span>
              </div>

              <img
                src={cropped}
                alt="裁剪后"
                className="max-h-64 mx-auto rounded-xl shadow-2xl mb-6"
              />

              <button
                onClick={handleDownload}
                className="w-full bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white py-3 rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all font-medium"
              >
                下载裁剪图片
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
