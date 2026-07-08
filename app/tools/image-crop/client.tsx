'use client';
import { useToolHistory } from '@/lib/useToolHistory';
import { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop, { type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import BackButton from '@/components/BackButton';
import FullscreenButton from '@/components/FullscreenButton';

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------
interface NaturalCrop { x: number; y: number; width: number; height: number }

const ASPECT_PRESETS = [
  { label: '自由', value: undefined },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16', value: 9 / 16 },
] as const;

const SCALE_MIN = 0.25;
const SCALE_MAX = 3;
const SCALE_STEP = 0.1;

// ---------------------------------------------------------------------------
// Coordinate helpers — these ONLY use DOM metrics, never state
// ---------------------------------------------------------------------------
function pixelToNatural(pixel: PixelCrop, img: HTMLImageElement): NaturalCrop {
  const sx = img.naturalWidth / img.clientWidth;
  const sy = img.naturalHeight / img.clientHeight;
  return {
    x: Math.round(pixel.x * sx),
    y: Math.round(pixel.y * sy),
    width: Math.round(pixel.width * sx),
    height: Math.round(pixel.height * sy),
  };
}

function naturalToPixel(n: NaturalCrop, img: HTMLImageElement): PixelCrop {
  const sx = img.naturalWidth / img.clientWidth;
  const sy = img.naturalHeight / img.clientHeight;
  return {
    unit: 'px',
    x: Math.round(n.x / sx),
    y: Math.round(n.y / sy),
    width: Math.round(n.width / sx),
    height: Math.round(n.height / sy),
  };
}

function clampNatural(n: NaturalCrop, iw: number, ih: number): NaturalCrop {
  return {
    x: Math.max(0, Math.min(n.x, iw - 1)),
    y: Math.max(0, Math.min(n.y, ih - 1)),
    width: Math.max(1, Math.min(n.width, iw - n.x)),
    height: Math.max(1, Math.min(n.height, ih - n.y)),
  };
}

function centerAspectCrop(dw: number, dh: number, aspect: number): PixelCrop {
  const w = dw * 0.8;
  const h = w / aspect;
  if (h <= dh) {
    return { unit: 'px', x: Math.round((dw - w) / 2), y: Math.round((dh - h) / 2), width: Math.round(w), height: Math.round(h) };
  }
  const h2 = dh * 0.8;
  const w2 = h2 * aspect;
  return { unit: 'px', x: Math.round((dw - w2) / 2), y: Math.round((dh - h2) / 2), width: Math.round(w2), height: Math.round(h2) };
}

// ===========================================================================
// Main Component
// ===========================================================================
export default function ImageCrop() {
  useToolHistory('image-crop');

  // --- core state ---
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [cropped, setCropped] = useState('');
  const [contentType, setContentType] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // --- crop state ---
  const [naturalCrop, setNaturalCrop] = useState<NaturalCrop>({ x: 0, y: 0, width: 0, height: 0 });
  const [pixelCrop, setPixelCrop] = useState<PixelCrop | undefined>(undefined);
  const [aspect, setAspect] = useState<number | undefined>();

  // --- zoom & fullscreen ---
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  // --- refs ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const initialisedRef = useRef(false);       // true after first onImageLoad
  const fromInputsRef = useRef(false);        // skip onChange when syncing from number inputs
  const fromNaturalRef = useRef(false);       // skip onChange when syncing from natural → pixel

  // rAF throttle for crop changes
  const pendingCropRef = useRef<PixelCrop | null>(null);
  const rafRef = useRef<number | null>(null);
  // pinch tracking
  const pinchBaseRef = useRef<{ dist: number; scale: number } | null>(null);

  // --- derived ---
  const displayWidth = Math.round(imageSize.width * scale) || 0;
  const shown = !isFullscreen; // whether normal layout is visible

  // ===================================================================
  // File upload
  // ===================================================================
  const processFile = useCallback((f: File) => {
    setFile(f);
    setCropped('');
    setScale(1);
    setAspect(undefined);
    setPixelCrop(undefined);
    setContentType(f.type);
    initialisedRef.current = false;
    const r = new FileReader();
    r.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
        setPreview(ev.target?.result as string);
      };
      img.src = ev.target?.result as string;
    };
    r.readAsDataURL(f);
  }, []);

  // ===================================================================
  // Image loaded — fires once (initial) + on every scale change (DOM resize)
  // ===================================================================
  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      imgRef.current = img;
      const cw = img.clientWidth;
      const ch = img.clientHeight;

      if (!initialisedRef.current) {
        // --- FIRST LOAD ---
        initialisedRef.current = true;
        const nw = img.naturalWidth;
        const nh = img.naturalHeight;
        const init: PixelCrop = aspect
          ? centerAspectCrop(cw, ch, aspect)
          : { unit: 'px', x: 0, y: 0, width: cw, height: ch };
        setPixelCrop(init);
        setNaturalCrop({ x: 0, y: 0, width: nw, height: nh });
      } else {
        // --- SCALE CHANGED: img physical size changed → recompute pixelCrop ---
        // naturalCrop is the source of truth in natural pixels
        setNaturalCrop((nat) => {
          fromNaturalRef.current = true;
          setPixelCrop(naturalToPixel(nat, img));
          return nat;
        });
      }
    },
    [aspect],
  );

  // ===================================================================
  // rAF-throttled onChange from ReactCrop
  // ===================================================================
  const onCropChange = useCallback((pc: PixelCrop) => {
    if (fromInputsRef.current || fromNaturalRef.current) return;
    const img = imgRef.current;
    if (!img) return;
    pendingCropRef.current = pc;
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const latest = pendingCropRef.current;
        if (!latest) return;
        pendingCropRef.current = null;
        setPixelCrop(latest);
        setNaturalCrop(pixelToNatural(latest, img));
      });
    }
  }, []);

  // cleanup rAF
  useEffect(() => () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); }, []);

  // ===================================================================
  // Number inputs → crop
  // ===================================================================
  const handleInputChange = useCallback((field: keyof NaturalCrop, val: string) => {
    const num = Math.max(0, parseInt(val) || 0);
    setNaturalCrop((prev) => {
      const next = clampNatural({ ...prev, [field]: num }, imageSize.width, imageSize.height);
      const img = imgRef.current;
      if (img) {
        fromInputsRef.current = true;
        setPixelCrop(naturalToPixel(next, img));
        requestAnimationFrame(() => { fromInputsRef.current = false; });
      }
      return next;
    });
  }, [imageSize]);

  // ===================================================================
  // Aspect ratio
  // ===================================================================
  const handleAspect = useCallback((a: number | undefined) => {
    setAspect(a);
    const img = imgRef.current;
    if (!img) return;
    if (a) {
      const nc = centerAspectCrop(img.clientWidth, img.clientHeight, a);
      setPixelCrop(nc);
      setNaturalCrop(pixelToNatural(nc, img));
    }
  }, []);

  // ===================================================================
  // Zoom — state only, DOM resize handled by onImageLoad
  // ===================================================================
  const zoomIn = useCallback(() => setScale((s) => Math.min(SCALE_MAX, Math.round((s + SCALE_STEP) * 100) / 100)), []);
  const zoomOut = useCallback(() => setScale((s) => Math.max(SCALE_MIN, Math.round((s - SCALE_STEP) * 100) / 100)), []);
  const resetZoom = useCallback(() => setScale(1), []);

  // ===================================================================
  // Global wheel & pinch — ALWAYS bound, works in normal + fullscreen
  // ===================================================================
  const handleWheel = useCallback((e: WheelEvent) => {
    // Only zoom if crop zone or fullscreen container is the active area
    const activeEl = cropContainerRef.current;
    const fsEl = fullscreenContainerRef.current;
    const target = e.target as HTMLElement;
    const inCropZone = activeEl?.contains(target) || fsEl?.contains(target);
    if (!inCropZone) return;
    e.preventDefault();
    if (e.deltaY < 0) zoomIn(); else zoomOut();
  }, [zoomIn, zoomOut]);

  const getDist = (t: TouchList) => {
    const dx = t[0].clientX - t[1].clientX;
    const dy = t[0].clientY - t[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      pinchBaseRef.current = { dist: getDist(e.touches), scale: scaleRef.current };
    }
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length !== 2 || !pinchBaseRef.current) return;
    const ratio = getDist(e.touches) / pinchBaseRef.current.dist;
    setScale(
      Math.max(SCALE_MIN, Math.min(SCALE_MAX, Math.round(pinchBaseRef.current.scale * ratio * 100) / 100)),
    );
  }, []);

  const onTouchEnd = useCallback(() => { pinchBaseRef.current = null; }, []);

  // ★ Single global listener — covers both normal and fullscreen
  useEffect(() => {
    if (!file) return;
    const onWheel = handleWheel;
    document.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('wheel', onWheel);
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [file, handleWheel, onTouchStart, onTouchMove, onTouchEnd]);

  // ===================================================================
  // Fullscreen
  // ===================================================================
  useEffect(() => {
    if (!isFullscreen) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreen(false); };
    window.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // ===================================================================
  // Actions
  // ===================================================================
  const doCrop = useCallback(() => {
    if (!preview) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = naturalCrop.width;
      c.height = naturalCrop.height;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, naturalCrop.x, naturalCrop.y, naturalCrop.width, naturalCrop.height, 0, 0, naturalCrop.width, naturalCrop.height);
      setCropped(c.toDataURL(contentType || 'image/png'));
    };
    img.src = preview;
  }, [preview, naturalCrop, contentType]);

  const handleReset = useCallback(() => {
    setFile(null); setPreview(''); setCropped('');
    setPixelCrop(undefined); setNaturalCrop({ x: 0, y: 0, width: 0, height: 0 });
    setAspect(undefined); setScale(1); setIsFullscreen(false);
    initialisedRef.current = false;
    imgRef.current = null;
  }, []);

  const handleDownload = useCallback(() => {
    if (!cropped || !file) return;
    const ext = contentType === 'image/jpeg' ? '.jpg' : contentType === 'image/webp' ? '.webp' : '.png';
    const a = document.createElement('a');
    a.href = cropped;
    a.download = `cropped_${file.name.replace(/\.[^.]+$/, '')}${ext}`;
    a.click();
  }, [cropped, file, contentType]);

  // ===================================================================
  // Clean up fromNaturalRef after React committed
  // ===================================================================
  useEffect(() => {
    if (fromNaturalRef.current) {
      fromNaturalRef.current = false;
    }
  });

  // ===================================================================
  // Shared crop zone (used in both normal + fullscreen)
  // ===================================================================
  const cropZone = (containerClassName: string) => (
    <div ref={cropContainerRef} className={containerClassName}>
      <ReactCrop crop={pixelCrop} aspect={aspect} onChange={onCropChange} minWidth={10} minHeight={10} ruleOfThirds>
        <img
          ref={imgRef}
          src={preview}
          alt="裁剪编辑"
          style={{ width: displayWidth || undefined, height: 'auto' }}
          onLoad={onImageLoad}
          draggable={false}
        />
      </ReactCrop>
    </div>
  );

  // ===================================================================
  // Fullscreen bars + overlay
  // ===================================================================
  const fsOverlay = isFullscreen && file && (
    <div ref={fullscreenContainerRef} className="fixed inset-0 z-50 flex flex-col bg-[#0a0a1a]">
      {/* top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/60 backdrop-blur shrink-0 border-b border-white/10">
        <button onClick={() => setIsFullscreen(false)} className="flex items-center gap-1 text-white/60 hover:text-white transition-colors text-sm">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          退出全屏
        </button>
        <span className="text-white/50 text-sm">{imageSize.width}×{imageSize.height} · 选区 {naturalCrop.width}×{naturalCrop.height}</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <input
              type="number"
              value={Math.round(scale * 100)}
              onChange={(e) => {
                const v = parseInt(e.target.value) || 100;
                setScale(Math.max(SCALE_MIN * 100, Math.min(SCALE_MAX * 100, v)) / 100);
              }}
              className="w-14 text-xs text-center bg-white/10 border border-white/20 rounded px-1.5 py-0.5 text-white focus:border-[#fb6400] focus:outline-none transition-colors"
              min={Math.round(SCALE_MIN * 100)}
              max={Math.round(SCALE_MAX * 100)}
              step={5}
            />
            <span className="text-xs text-white/30 ml-0.5">%</span>
          </div>
          {scale !== 1 && (
            <button onClick={resetZoom} className="text-xs text-[#fb6400] hover:text-[#ff8c00] transition-colors">重置缩放</button>
          )}
        </div>
      </div>
      {/* crop zone */}
      {cropZone('flex-1 overflow-auto bg-[#0a0a1a]')}
      {/* bottom bar */}
      <div className="shrink-0 bg-black/60 backdrop-blur border-t border-white/10 px-4 py-2">
        <div className="flex items-center gap-3 justify-center flex-wrap">
          <div className="flex gap-1.5">
            {ASPECT_PRESETS.map((p) => (
              <button key={p.label} onClick={() => handleAspect(p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  aspect === p.value
                    ? 'bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white'
                    : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => { doCrop(); setIsFullscreen(false); }}
            className="bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white px-4 py-1.5 rounded-lg text-sm font-medium active:shadow-lg active:shadow-orange-500/30 active:scale-[0.97]"
          >
            裁剪
          </button>
        </div>
      </div>
    </div>
  );

  // ===================================================================
  // Normal header
  // ===================================================================
  const normalHeader = (
    <header className="fixed top-0 left-0 right-0 z-40 bg-black/40 backdrop-blur-xl safe-area-top border-b border-white/10">
      <div className="max-w-4xl mx-auto px-6 py-3 flex items-center">
        <BackButton category="image" />
        <div className="flex items-center space-x-3">
          <img src="/logo.png" alt="9943" className="w-8 h-8 rounded-lg shadow-lg shadow-orange-500/30" />
          <h1 className="text-lg font-semibold text-white">图片裁剪</h1>
        </div>
        <FullscreenButton className="ml-auto" />
      </div>
    </header>
  );

  // ===================================================================
  // RENDER
  // ===================================================================
  return (
    <div className="min-h-screen relative z-10">
      {shown && normalHeader}
      {fsOverlay}

      {/* Normal content */}
      {shown && (
        <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
          <div className="animate-fade-in">
            {/* ① Upload */}
            <div
              className={`glass-card p-8 cursor-pointer transition-all duration-300 ${isDragging ? 'border-[#fb6400] bg-[#fb6400]/10' : 'hover:border-white/20'}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              onDrop={(e) => {
                e.preventDefault(); setIsDragging(false);
                const f = e.dataTransfer.files[0];
                if (f?.type.startsWith('image/')) processFile(f);
              }}
            >
              <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => {
                const f = e.target.files?.[0]; if (f) processFile(f);
              }} className="hidden" />
              {preview ? (
                <div className="text-center">
                  <img src={preview} alt="原图" className="max-h-48 mx-auto rounded-xl" />
                  <p className="text-sm text-white/50 mt-2">{file?.name} · {imageSize.width} × {imageSize.height} 像素</p>
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

            {/* ② Controls */}
            {file && (
              <div className="mt-6 glass-card p-6 animate-slide-up">
                <div className="flex gap-2 mb-4 flex-wrap">
                  {ASPECT_PRESETS.map((p) => (
                    <button key={p.label} onClick={() => handleAspect(p.value)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                        aspect === p.value
                          ? 'bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white shadow-lg shadow-orange-500/30'
                          : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                      }`}
                    >{p.label}</button>
                  ))}
                </div>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-white/70">裁剪参数</span>
                  <span className="text-sm text-white/50">{naturalCrop.width} × {naturalCrop.height} 像素</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  {([
                    ['X 坐标', naturalCrop.x, 0, imageSize.width],
                    ['Y 坐标', naturalCrop.y, 0, imageSize.height],
                    ['宽度', naturalCrop.width, 1, imageSize.width],
                    ['高度', naturalCrop.height, 1, imageSize.height],
                  ] as const).map(([label, value, min, max]) => (
                    <div key={label}>
                      <label className="block text-sm text-white/50 mb-1">{label}</label>
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => handleInputChange(
                          label === 'X 坐标' ? 'x' : label === 'Y 坐标' ? 'y' : label === '宽度' ? 'width' : 'height',
                          e.target.value,
                        )}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-[#fb6400] focus:outline-none transition-colors"
                        min={min}
                        max={max}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex space-x-3">
                  {/* ★ Plain button — no transition, no animation, just static */}
                  <button
                    onClick={doCrop}
                    className="flex-1 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white py-3 rounded-xl font-medium active:shadow-lg active:shadow-orange-500/30 active:scale-[0.98]"
                  >
                    开始裁剪
                  </button>
                  <button onClick={handleReset} className="px-6 py-3 border border-white/20 rounded-xl hover:bg-white/10 transition-colors text-white/70">
                    重置
                  </button>
                </div>
              </div>
            )}

            {/* ③ Crop Zone */}
            {file && (
              <div className="mt-6 glass-card p-4 animate-slide-up">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-white/70">拖拽选区 · 滚轮缩放</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white/50">原始: {imageSize.width} × {imageSize.height}</span>
                    <div className="flex items-center">
                      <input
                        type="number"
                        value={Math.round(scale * 100)}
                        onChange={(e) => {
                          const v = parseInt(e.target.value) || 100;
                          setScale(Math.max(SCALE_MIN * 100, Math.min(SCALE_MAX * 100, v)) / 100);
                        }}
                        className="w-14 text-xs text-center bg-white/10 border border-white/20 rounded px-1.5 py-0.5 text-white focus:border-[#fb6400] focus:outline-none transition-colors"
                        min={Math.round(SCALE_MIN * 100)}
                        max={Math.round(SCALE_MAX * 100)}
                        step={5}
                      />
                      <span className="text-xs text-white/30 ml-0.5">%</span>
                    </div>
                    {scale !== 1 && (
                      <button onClick={resetZoom} className="text-xs text-[#fb6400] hover:text-[#ff8c00] transition-colors">⟲</button>
                    )}
                    <button onClick={() => setIsFullscreen(true)} className="text-xs text-white/40 hover:text-[#fb6400] transition-colors ml-1" title="全屏裁剪">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </button>
                  </div>
                </div>
                {cropZone('overflow-auto max-h-[55vh]')}
              </div>
            )}

            {/* ④ Result */}
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
                  <span className="text-sm text-white/50">{naturalCrop.width} × {naturalCrop.height} 像素</span>
                </div>
                <img src={cropped} alt="裁剪后" className="max-h-64 mx-auto rounded-xl shadow-2xl mb-6" />
                <button
                  onClick={handleDownload}
                  className="w-full bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white py-3 rounded-xl font-medium active:shadow-lg active:shadow-orange-500/30 active:scale-[0.98]"
                >
                  下载裁剪图片
                </button>
              </div>
            )}
          </div>
        </main>
      )}
    </div>
  );
}
