'use client';

import { useState, useRef, useCallback } from 'react';
import BackButton from '@/components/BackButton';

interface ExtractedIcon {
  width: number;
  height: number;
  url: string;
  format: string;
  size: number;
}

interface RawIcon {
  width: number;
  height: number;
  data: ArrayBuffer;
  format: 'bmp' | 'png';
  colorCount: number;
}

function extractIconsFromPE(buffer: ArrayBuffer): RawIcon[] {
  const view = new DataView(buffer);
  const icons: RawIcon[] = [];

  if (view.getUint16(0, true) !== 0x5A4D) {
    throw new Error('不是有效的 PE 文件');
  }

  const peOffset = view.getUint32(0x3C, true);
  if (view.getUint32(peOffset, true) !== 0x00004550) {
    throw new Error('不是有效的 PE 文件');
  }

  const numSections = view.getUint16(peOffset + 6, true);
  const optionalHeaderSize = view.getUint16(peOffset + 20, true);
  const optionalHeaderOffset = peOffset + 24;
  const magic = view.getUint16(optionalHeaderOffset, true);
  const isPE32Plus = magic === 0x20B;

  const resourceDirIndex = isPE32Plus ? 138 : 92;
  const resourceRVA = view.getUint32(optionalHeaderOffset + resourceDirIndex, true);
  const resourceSize = view.getUint32(optionalHeaderOffset + resourceDirIndex + 4, true);

  if (resourceRVA === 0 || resourceSize === 0) {
    throw new Error('文件中未找到资源');
  }

  const sectionHeaderOffset = optionalHeaderOffset + optionalHeaderSize;
  let resourceFileOffset = 0;

  for (let i = 0; i < numSections; i++) {
    const sectionOffset = sectionHeaderOffset + i * 40;
    const sectionRVA = view.getUint32(sectionOffset + 12, true);
    const sectionSize = view.getUint32(sectionOffset + 16, true);
    const sectionFileOffset = view.getUint32(sectionOffset + 20, true);

    if (resourceRVA >= sectionRVA && resourceRVA < sectionRVA + sectionSize) {
      resourceFileOffset = sectionFileOffset + (resourceRVA - sectionRVA);
      break;
    }
  }

  if (resourceFileOffset === 0) {
    throw new Error('无法定位资源目录');
  }

  const parseDir = (dirOffset: number, typeId: number) => {
    const entries: { id: number; offsetToData: number }[] = [];
    if (dirOffset + 16 > buffer.byteLength) return entries;

    const numNamed = view.getUint16(dirOffset + 12, true);
    const numId = view.getUint16(dirOffset + 14, true);

    for (let i = 0; i < numNamed + numId; i++) {
      const entryOff = dirOffset + 16 + i * 8;
      if (entryOff + 8 > buffer.byteLength) break;

      const nameOrId = view.getUint32(entryOff, true);
      const offsetToData = view.getUint32(entryOff + 4, true);

      if (nameOrId & 0x80000000) continue;
      if (typeId === -1 || nameOrId === typeId) {
        entries.push({ id: nameOrId, offsetToData });
      }
    }
    return entries;
  };

  const readDataEntry = (offset: number) => {
    if (offset + 16 > buffer.byteLength) return null;
    return {
      offsetToData: view.getUint32(offset, true),
      size: view.getUint32(offset + 4, true),
    };
  };

  const groupIconEntries = parseDir(resourceFileOffset, 14);

  for (const groupEntry of groupIconEntries) {
    if (!(groupEntry.offsetToData & 0x80000000)) continue;

    const groupDirOffset = resourceFileOffset + (groupEntry.offsetToData & 0x7FFFFFFF);
    const iconEntries = parseDir(groupDirOffset, -1);

    for (const iconEntry of iconEntries) {
      const iconDataEntries = parseDir(
        resourceFileOffset + (iconEntry.offsetToData & 0x7FFFFFFF), 3
      );

      if (iconDataEntries.length > 0) {
        const dataEntry = readDataEntry(
          resourceFileOffset + (iconDataEntries[0].offsetToData & 0x7FFFFFFF)
        );

        if (dataEntry) {
          const iconData = buffer.slice(dataEntry.offsetToData, dataEntry.offsetToData + dataEntry.size);
          const sig = new Uint8Array(iconData, 0, 4);
          const format: 'bmp' | 'png' = (sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4E && sig[3] === 0x47) ? 'png' : 'bmp';

          const groupSubDirOffset = resourceFileOffset + (iconEntry.offsetToData & 0x7FFFFFFF);
          const subDirEntries = parseDir(groupSubDirOffset, -1);
          const iconDirOffset = subDirEntries.length > 0 ?
            resourceFileOffset + (subDirEntries[0].offsetToData & 0x7FFFFFFF) : 0;

          if (iconDirOffset > 0) {
            const de2 = readDataEntry(iconDirOffset);
            if (de2 && de2.size >= 6) {
              const iconDirData = new DataView(buffer, de2.offsetToData, de2.size);
              icons.push({
                width: iconDirData.getUint8(0) || 256,
                height: iconDirData.getUint8(1) || 256,
                colorCount: iconDirData.getUint8(2),
                data: iconData,
                format,
              });
            }
          }
        }
      }
    }
  }

  return icons;
}

function extractIconsFromICO(buffer: ArrayBuffer): RawIcon[] {
  const view = new DataView(buffer);
  const icons: RawIcon[] = [];

  const type = view.getUint16(2, true);
  const count = view.getUint16(4, true);

  if (type !== 1 && type !== 2) {
    throw new Error('不是有效的 ICO/CUR 文件');
  }

  for (let i = 0; i < count; i++) {
    const entryOffset = 6 + i * 16;
    if (entryOffset + 16 > buffer.byteLength) break;

    const width = view.getUint8(entryOffset) || 256;
    const height = view.getUint8(entryOffset + 1) || 256;
    const colorCount = view.getUint8(entryOffset + 2);
    const dataSize = view.getUint32(entryOffset + 8, true);
    const dataOffset = view.getUint32(entryOffset + 12, true);

    if (dataOffset + dataSize > buffer.byteLength) continue;

    const iconData = buffer.slice(dataOffset, dataOffset + dataSize);
    const sig = new Uint8Array(iconData, 0, 4);
    const format: 'bmp' | 'png' = (sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4E && sig[3] === 0x47) ? 'png' : 'bmp';

    icons.push({ width, height, colorCount, data: iconData, format });
  }

  return icons;
}

function bmpToPng(bmpData: ArrayBuffer): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const view = new DataView(bmpData);
    const width = view.getInt32(4, true);
    const height = view.getInt32(8, true) / 2;
    const bitsPerPixel = view.getUint16(14, true);
    const headerSize = view.getUint32(0, true);

    let dataOffset = headerSize;
    if (bitsPerPixel <= 8) {
      const numColors = view.getUint32(32, true) || (1 << bitsPerPixel);
      dataOffset += numColors * 4;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width > 0 ? width : 256;
    canvas.height = height > 0 ? height : 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) { reject(new Error('Canvas 创建失败')); return; }

    const imageData = ctx.createImageData(canvas.width, canvas.height);

    if (bitsPerPixel === 32) {
      const rowSize = width * 4;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const src = dataOffset + (height - 1 - y) * rowSize + x * 4;
          const dst = (y * width + x) * 4;
          if (src + 4 <= bmpData.byteLength) {
            imageData.data[dst] = view.getUint8(src + 2);
            imageData.data[dst + 1] = view.getUint8(src + 1);
            imageData.data[dst + 2] = view.getUint8(src);
            imageData.data[dst + 3] = view.getUint8(src + 3);
          }
        }
      }
    } else if (bitsPerPixel === 24) {
      const rowSize = ((width * 3 + 3) / 4 | 0) * 4;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const src = dataOffset + (height - 1 - y) * rowSize + x * 3;
          const dst = (y * width + x) * 4;
          if (src + 3 <= bmpData.byteLength) {
            imageData.data[dst] = view.getUint8(src + 2);
            imageData.data[dst + 1] = view.getUint8(src + 1);
            imageData.data[dst + 2] = view.getUint8(src);
            imageData.data[dst + 3] = 255;
          }
        }
      }
    } else {
      const blob = new Blob([bmpData], { type: 'image/bmp' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((b) => { URL.revokeObjectURL(url); b ? resolve(b) : reject(new Error('PNG 转换失败')); }, 'image/png');
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('BMP 加载失败')); };
      img.src = url;
      return;
    }

    ctx.putImageData(imageData, 0, 0);
    canvas.toBlob((blob) => { blob ? resolve(blob) : reject(new Error('PNG 转换失败')); }, 'image/png');
  });
}

export default function IconExtractPage() {
  const [file, setFile] = useState<File | null>(null);
  const [icons, setIcons] = useState<ExtractedIcon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
  };

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setIcons([]);
    setError('');
    setLoading(true);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();

      let rawIcons: RawIcon[] = [];
      if (ext === 'ico' || ext === 'cur') {
        rawIcons = extractIconsFromICO(buffer);
      } else if (['exe', 'dll', 'ocx', 'cpl', 'scr'].includes(ext || '')) {
        rawIcons = extractIconsFromPE(buffer);
      } else {
        throw new Error('不支持的文件格式，请上传 EXE/DLL/ICO 等文件');
      }

      if (rawIcons.length === 0) {
        throw new Error('文件中未找到图标');
      }

      const convertedIcons: ExtractedIcon[] = [];
      for (const icon of rawIcons) {
        let blob: Blob;
        if (icon.format === 'png') {
          blob = new Blob([icon.data], { type: 'image/png' });
        } else {
          blob = await bmpToPng(icon.data);
        }
        convertedIcons.push({
          width: icon.width,
          height: icon.height,
          url: URL.createObjectURL(blob),
          format: 'PNG',
          size: blob.size,
        });
      }

      convertedIcons.sort((a, b) => a.width - b.width);
      setIcons(convertedIcons);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提取图标失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) processFile(droppedFile);
  }, []);

  const handleDownload = (icon: ExtractedIcon) => {
    const link = document.createElement('a');
    link.href = icon.url;
    link.download = `${file?.name?.replace(/\.[^.]+$/, '') || 'icon'}_${icon.width}x${icon.height}.png`;
    link.click();
  };

  const handleDownloadAll = () => {
    icons.forEach((icon, i) => setTimeout(() => handleDownload(icon), i * 200));
  };

  return (
    <div className="min-h-screen relative z-10">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center">
          <BackButton toolId="icon-extract" />
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="9943" className="w-8 h-8 rounded-lg shadow-lg shadow-orange-500/30" />
            <h1 className="text-lg font-semibold text-white">图标提取</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-24 pb-16">
        <div
          className={`glass-card p-8 mb-6 animate-fade-in cursor-pointer transition-all ${isDragging ? 'border-[#fb6400] bg-[#fb6400]/10' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input ref={fileInputRef} type="file" accept=".exe,.dll,.ico,.cur,.ocx,.cpl,.scr" onChange={handleFileChange} className="hidden" />
          <div className="text-center">
            <div className="text-4xl mb-3">📁</div>
            <h2 className="text-lg font-semibold text-white mb-2">{file ? file.name : '点击或拖拽上传文件'}</h2>
            <p className="text-white/40 text-sm">
              {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB · 点击重新选择` : '支持 EXE、DLL、ICO 等文件格式'}
            </p>
          </div>
        </div>

        {loading && (
          <div className="glass-card p-8 mb-6 animate-fade-in">
            <div className="flex items-center justify-center gap-3">
              <svg className="animate-spin h-6 w-6 text-[#fb6400]" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-white/60">正在提取图标...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="glass-card p-6 mb-6 animate-fade-in border-red-500/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-medium">提取失败</h3>
                <p className="text-sm text-white/40">{error}</p>
              </div>
            </div>
          </div>
        )}

        {icons.length > 0 && (
          <div className="glass-card p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">提取成功 · 共 {icons.length} 个图标</h2>
              <button onClick={handleDownloadAll} className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#fb6400] to-[#ff8c00] rounded-lg hover:opacity-90 transition-opacity">
                全部下载
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {icons.map((icon, index) => (
                <div key={index} className="bg-white/5 rounded-xl p-4 text-center hover:bg-white/10 transition-colors">
                  <div className="flex items-center justify-center h-20 mb-3">
                    <img src={icon.url} alt={`${icon.width}x${icon.height}`} className="max-w-full max-h-full" style={{ imageRendering: 'pixelated' }} />
                  </div>
                  <p className="text-white text-sm font-medium mb-1">{icon.width} × {icon.height}</p>
                  <p className="text-white/40 text-xs mb-3">{(icon.size / 1024).toFixed(1)} KB</p>
                  <button onClick={() => handleDownload(icon)} className="w-full py-2 text-xs font-medium text-[#fb6400] bg-[#fb6400]/10 rounded-lg hover:bg-[#fb6400]/20 transition-colors">
                    下载 PNG
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="glass-card p-6 mt-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <h3 className="text-white font-semibold mb-3">💡 使用说明</h3>
          <ul className="space-y-2 text-white/50 text-sm">
            <li>• 上传 EXE、DLL、ICO 等文件，自动提取其中的图标</li>
            <li>• 支持提取多种尺寸的图标（16×16, 32×32, 48×48, 256×256 等）</li>
            <li>• 提取的图标以 PNG 格式保存，支持透明背景</li>
            <li>• 可以单个下载或批量下载所有图标</li>
            <li>• 文件仅在浏览器本地处理，不会上传到服务器</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
