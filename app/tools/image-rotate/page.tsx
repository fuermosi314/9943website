'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import BackButton from '@/components/BackButton';

export default function ImageRotate() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [customAngle, setCustomAngle] = useState('');
  const [result, setResult] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    setResult('');
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setCustomAngle('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height });
      };
      img.src = event.target?.result as string;
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

  const updatePreview = useCallback(() => {
    if (!preview || !canvasRef.current) return;

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current!;
      const rad = (rotation * Math.PI) / 180;
      const absCos = Math.abs(Math.cos(rad));
      const absSin = Math.abs(Math.sin(rad));
      const newW = img.width * absCos + img.height * absSin;
      const newH = img.width * absSin + img.height * absCos;

      canvas.width = newW;
      canvas.height = newH;

      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, newW, newH);
      ctx.save();
      ctx.translate(newW / 2, newH / 2);
      ctx.rotate(rad);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();
    };
    img.src = preview;
  }, [preview, rotation, flipH, flipV]);

  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  const applyCustomAngle = () => {
    const angle = parseFloat(customAngle);
    if (!isNaN(angle) && angle >= 0 && angle <= 360) {
      setRotation(angle % 360);
    }
  };

  const handleApply = () => {
    if (!canvasRef.current) return;
    setResult(canvasRef.current.toDataURL('image/png'));
  };

  const handleDownload = () => {
    if (!result || !file) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = `rotated_${file.name}`;
    link.click();
  };

  const handleReset = () => {
    setFile(null);
    setPreview('');
    setResult('');
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setCustomAngle('');
    setImageSize({ width: 0, height: 0 });
  };

  return (
    <div className="min-h-screen relative z-10">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center">
          <BackButton toolId="image-rotate" />
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="9943" className="w-8 h-8 rounded-lg shadow-lg shadow-orange-500/30" />
            <h1 className="text-lg font-semibold text-white">图片旋转/翻转</h1>
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
                <canvas
                  ref={canvasRef}
                  className="max-h-64 mx-auto rounded-xl shadow-2xl"
                  style={{ display: rotation !== 0 || flipH || flipV ? 'block' : 'none' }}
                />
                {rotation === 0 && !flipH && !flipV && (
                  <img
                    src={preview}
                    alt="预览"
                    className="max-h-64 mx-auto rounded-xl shadow-2xl"
                  />
                )}
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

          {/* Controls */}
          {file && (
            <div className="mt-6 glass-card p-6 animate-slide-up">
              {/* Rotation Buttons */}
              <div className="mb-6">
                <span className="text-sm font-medium text-white/70 block mb-3">旋转</span>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                    className="flex-1 min-w-[100px] py-2.5 px-4 border border-white/20 rounded-xl hover:bg-white/10 transition-colors text-white/80 text-sm font-medium"
                  >
                    ↺ 左旋90°
                  </button>
                  <button
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="flex-1 min-w-[100px] py-2.5 px-4 border border-white/20 rounded-xl hover:bg-white/10 transition-colors text-white/80 text-sm font-medium"
                  >
                    ↻ 右旋90°
                  </button>
                  <button
                    onClick={() => setRotation((r) => (r + 180) % 360)}
                    className="flex-1 min-w-[100px] py-2.5 px-4 border border-white/20 rounded-xl hover:bg-white/10 transition-colors text-white/80 text-sm font-medium"
                  >
                    ↻ 180°
                  </button>
                </div>
              </div>

              {/* Flip Buttons */}
              <div className="mb-6">
                <span className="text-sm font-medium text-white/70 block mb-3">翻转</span>
                <div className="flex gap-3">
                  <button
                    onClick={() => setFlipH((v) => !v)}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                      flipH
                        ? 'bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white shadow-lg shadow-orange-500/30'
                        : 'border border-white/20 hover:bg-white/10 text-white/80'
                    }`}
                  >
                    ⇔ 水平翻转
                  </button>
                  <button
                    onClick={() => setFlipV((v) => !v)}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                      flipV
                        ? 'bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white shadow-lg shadow-orange-500/30'
                        : 'border border-white/20 hover:bg-white/10 text-white/80'
                    }`}
                  >
                    ⇕ 垂直翻转
                  </button>
                </div>
              </div>

              {/* Custom Angle */}
              <div className="mb-6">
                <span className="text-sm font-medium text-white/70 block mb-3">自定义角度</span>
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={customAngle}
                    onChange={(e) => setCustomAngle(e.target.value)}
                    placeholder="0-360"
                    min="0"
                    max="360"
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-[#fb6400] focus:outline-none transition-colors"
                  />
                  <button
                    onClick={applyCustomAngle}
                    className="px-6 py-2 border border-white/20 rounded-lg hover:bg-white/10 transition-colors text-white/80 text-sm font-medium"
                  >
                    应用
                  </button>
                </div>
              </div>

              {/* Current State */}
              <div className="mb-6 flex items-center gap-2 text-sm text-white/50">
                <span>当前：</span>
                <span className="text-white/70">旋转 {rotation}°</span>
                {flipH && <span className="text-white/70">| 水平翻转</span>}
                {flipV && <span className="text-white/70">| 垂直翻转</span>}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleApply}
                  className="flex-1 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white py-3 rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all font-medium"
                >
                  应用变换
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

          {/* Result */}
          {result && (
            <div className="mt-6 glass-card p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="font-medium text-white">变换完成</span>
                </div>
              </div>

              <img
                src={result}
                alt="变换后"
                className="max-h-64 mx-auto rounded-xl shadow-2xl mb-6"
              />

              <button
                onClick={handleDownload}
                className="w-full bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white py-3 rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all font-medium"
              >
                下载变换后的图片
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
