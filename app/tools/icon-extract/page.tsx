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

// ===== PE 文件图标提取 =====
function extractIconsFromPE(buffer: ArrayBuffer): ExtractedIcon[] {
  const view = new DataView(buffer);
  const u8 = new Uint8Array(buffer);

  // 验证 MZ 头
  if (buffer.byteLength < 64 || view.getUint16(0, true) !== 0x5A4D) {
    throw new Error('不是有效的 PE 文件');
  }

  // 找到 PE 头
  const peOffset = view.getUint32(0x3C, true);
  if (peOffset + 4 > buffer.byteLength || view.getUint32(peOffset, true) !== 0x00004550) {
    throw new Error('PE 头损坏');
  }

  // 解析 Optional Header
  const optOffset = peOffset + 24;
  const magic = view.getUint16(optOffset, true);
  const is64 = magic === 0x20B;
  const numSections = view.getUint16(peOffset + 6, true);
  const optHeaderSize = view.getUint16(peOffset + 20, true);

  // 资源目录 RVA 和 Size（在 DataDirectory 中的索引 2）
  const dataDirOffset = optOffset + (is64 ? 112 : 96);
  const resRVA = view.getUint32(dataDirOffset + 8, true);
  const resSize = view.getUint32(dataDirOffset + 12, true);

  if (resRVA === 0 || resSize === 0) {
    throw new Error('文件中未找到资源段');
  }

  // 找到资源段的文件偏移
  const sectionStart = optOffset + optHeaderSize;
  let resFileBase = 0;

  for (let i = 0; i < numSections; i++) {
    const secOff = sectionStart + i * 40;
    if (secOff + 40 > buffer.byteLength) break;
    const secRVA = view.getUint32(secOff + 12, true);
    const secSize = view.getUint32(secOff + 8, true);
    const secRaw = view.getUint32(secOff + 20, true);
    if (resRVA >= secRVA && resRVA < secRVA + secSize) {
      resFileBase = secRaw + (resRVA - secRVA);
      break;
    }
  }

  if (resFileBase === 0) {
    throw new Error('无法定位资源段');
  }

  // 读取资源目录条目
  type DirEntry = { id: number; offset: number; isDir: boolean };
  function readDirEntries(dirOffset: number): DirEntry[] {
    if (dirOffset + 16 > buffer.byteLength) return [];
    const numNamed = view.getUint16(dirOffset + 12, true);
    const numId = view.getUint16(dirOffset + 14, true);
    const entries: DirEntry[] = [];
    for (let i = 0; i < numNamed + numId; i++) {
      const entryOff = dirOffset + 16 + i * 8;
      if (entryOff + 8 > buffer.byteLength) break;
      const nameOrId = view.getUint32(entryOff, true);
      const dataOrSubdir = view.getUint32(entryOff + 4, true);
      const isDir = (dataOrSubdir & 0x80000000) !== 0;
      const id = nameOrId & 0x7FFFFFFF;
      const offset = dataOrSubdir & 0x7FFFFFFF;
      entries.push({ id, offset, isDir });
    }
    return entries;
  }

  function readDataEntry(offset: number): { rva: number; size: number } | null {
    if (offset + 16 > buffer.byteLength) return null;
    return {
      rva: view.getUint32(offset, true),
      size: view.getUint32(offset + 4, true),
    };
  }

  // RVA 转文件偏移
  function rvaToFile(rva: number): number {
    for (let i = 0; i < numSections; i++) {
      const secOff = sectionStart + i * 40;
      const secRVA = view.getUint32(secOff + 12, true);
      const secSize = view.getUint32(secOff + 8, true);
      const secRaw = view.getUint32(secOff + 20, true);
      if (rva >= secRVA && rva < secRVA + secSize) {
        return secRaw + (rva - secRVA);
      }
    }
    return 0;
  }

  // 第一层：找 RT_GROUP_ICON (14) 和 RT_ICON (3)
  const typeEntries = readDirEntries(resFileBase);
  const groupIconType = typeEntries.find((e) => e.id === 14 && e.isDir);
  const iconType = typeEntries.find((e) => e.id === 3 && e.isDir);

  if (!groupIconType) {
    throw new Error('文件中未找到图标组');
  }

  // 收集所有 RT_ICON 数据（id -> file offset + size）
  const iconDataMap = new Map<number, { offset: number; size: number }>();
  if (iconType) {
    const iconNames = readDirEntries(resFileBase + iconType.offset);
    for (const nameEntry of iconNames) {
      if (!nameEntry.isDir) continue;
      const langEntries = readDirEntries(resFileBase + nameEntry.offset);
      for (const lang of langEntries) {
        if (lang.isDir) continue;
        const de = readDataEntry(resFileBase + lang.offset);
        if (de) {
          const fileOff = rvaToFile(de.rva);
          if (fileOff > 0) {
            iconDataMap.set(nameEntry.id, { offset: fileOff, size: de.size });
          }
        }
      }
    }
  }

  // 第二层：解析 RT_GROUP_ICON
  const groupNames = readDirEntries(resFileBase + groupIconType.offset);
  const results: ExtractedIcon[] = [];

  for (const nameEntry of groupNames) {
    if (!nameEntry.isDir) continue;
    const langEntries = readDirEntries(resFileBase + nameEntry.offset);
    for (const lang of langEntries) {
      if (lang.isDir) continue;
      const de = readDataEntry(resFileBase + lang.offset);
      if (!de) continue;

      const groupFileOff = rvaToFile(de.rva);
      if (groupFileOff === 0 || groupFileOff + 6 > buffer.byteLength) continue;

      // GRPICONDIR
      const count = view.getUint16(groupFileOff + 4, true);

      // 取最大的图标
      let bestIdx = -1;
      let bestSize = 0;
      for (let i = 0; i < count; i++) {
        const entryOff = groupFileOff + 6 + i * 14;
        if (entryOff + 14 > buffer.byteLength) break;
        const w = view.getUint8(entryOff) || 256;
        const h = view.getUint8(entryOff + 1) || 256;
        const pixelSize = w * h;
        if (pixelSize > bestSize) {
          bestSize = pixelSize;
          bestIdx = i;
        }
      }

      if (bestIdx < 0) continue;

      const entryOff = groupFileOff + 6 + bestIdx * 14;
      const w = view.getUint8(entryOff) || 256;
      const h = view.getUint8(entryOff + 1) || 256;
      const iconId = view.getUint16(entryOff + 12, true);

      const iconInfo = iconDataMap.get(iconId);
      if (!iconInfo) continue;

      // 读取图标数据
      const iconBuf = buffer.slice(iconInfo.offset, iconInfo.offset + iconInfo.size);
      const sig = new Uint8Array(iconBuf, 0, Math.min(4, iconBuf.byteLength));
      const isPng = sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4E && sig[3] === 0x47;

      if (isPng) {
        const blob = new Blob([iconBuf], { type: 'image/png' });
        results.push({
          width: w,
          height: h,
          url: URL.createObjectURL(blob),
          format: 'PNG',
          size: blob.size,
        });
      } else {
        // BMP 格式：构造 ICO 文件头 + 数据
        const icoHeader = new ArrayBuffer(6);
        const icoView = new DataView(icoHeader);
        icoView.setUint16(0, 0, true); // reserved
        icoView.setUint16(2, 1, true); // type = icon
        icoView.setUint16(4, 1, true); // count = 1

        const icoEntry = new ArrayBuffer(16);
        const entryView = new DataView(icoEntry);
        entryView.setUint8(0, w === 256 ? 0 : w);
        entryView.setUint8(1, h === 256 ? 0 : h);
        entryView.setUint8(2, 0); // color count
        entryView.setUint8(3, 0); // reserved
        entryView.setUint16(4, 1, true); // planes
        entryView.setUint16(6, 32, true); // bpp
        entryView.setUint32(8, iconBuf.byteLength, true); // data size
        entryView.setUint32(12, 22, true); // data offset (6 + 16)

        const blob = new Blob([icoHeader, icoEntry, iconBuf], { type: 'image/x-icon' });
        const url = URL.createObjectURL(blob);

        // 用 canvas 转成 PNG
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            canvas.toBlob((pngBlob) => {
              URL.revokeObjectURL(url);
              if (pngBlob) {
                const pngUrl = URL.createObjectURL(pngBlob);
                const existing = results.find((r) => r.url === url);
                if (existing) {
                  existing.url = pngUrl;
                  existing.format = 'PNG';
                  existing.size = pngBlob.size;
                }
              }
            }, 'image/png');
          }
        };
        img.src = url;

        results.push({
          width: w,
          height: h,
          url,
          format: 'ICO',
          size: iconBuf.byteLength,
        });
      }
    }
  }

  return results;
}

// ===== ICO 文件解析 =====
function extractIconsFromICO(buffer: ArrayBuffer): ExtractedIcon[] {
  const view = new DataView(buffer);
  const count = view.getUint16(4, true);
  const results: ExtractedIcon[] = [];

  for (let i = 0; i < count; i++) {
    const off = 6 + i * 16;
    if (off + 16 > buffer.byteLength) break;
    const w = view.getUint8(off) || 256;
    const h = view.getUint8(off + 1) || 256;
    const size = view.getUint32(off + 8, true);
    const offset = view.getUint32(off + 12, true);
    if (offset + size > buffer.byteLength) continue;

    const data = buffer.slice(offset, offset + size);
    const sig = new Uint8Array(data, 0, 4);
    const isPng = sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4E && sig[3] === 0x47;

    if (isPng) {
      const blob = new Blob([data], { type: 'image/png' });
      results.push({ width: w, height: h, url: URL.createObjectURL(blob), format: 'PNG', size: blob.size });
    } else {
      // BMP in ICO: 需要构造完整的 ICO 文件让浏览器渲染
      const icoHeader = new ArrayBuffer(6);
      const hdrView = new DataView(icoHeader);
      hdrView.setUint16(0, 0, true);
      hdrView.setUint16(2, 1, true);
      hdrView.setUint16(4, 1, true);

      const icoEntry = new ArrayBuffer(16);
      const entView = new DataView(icoEntry);
      entView.setUint8(0, w === 256 ? 0 : w);
      entView.setUint8(1, h === 256 ? 0 : h);
      entView.setUint16(4, 1, true);
      entView.setUint16(6, 32, true);
      entView.setUint32(8, size, true);
      entView.setUint32(12, 22, true);

      const blob = new Blob([icoHeader, icoEntry, data], { type: 'image/x-icon' });
      results.push({ width: w, height: h, url: URL.createObjectURL(blob), format: 'ICO', size });
    }
  }

  return results;
}

// ===== LNK 快捷方式解析 =====
function extractIconFromLNK(buffer: ArrayBuffer): ExtractedIcon[] {
  const view = new DataView(buffer);
  const u8 = new Uint8Array(buffer);

  // 验证 LNK 签名
  if (buffer.byteLength < 76 || view.getUint32(0, true) !== 0x0000004C) {
    throw new Error('不是有效的快捷方式文件');
  }

  const flags = view.getUint32(20, true);
  const hasIconLocation = (flags & 0x00000400) !== 0; // HasIconLocationFlag

  if (!hasIconLocation) {
    throw new Error('该快捷方式没有自定义图标');
  }

  // ShellLinkHeader 固定 76 字节，后面是 LinkInfo 和 StringData
  // 跳过 LinkInfo
  let offset = 76;

  const hasLinkInfo = (flags & 0x00000002) !== 0;
  if (hasLinkInfo && offset + 4 <= buffer.byteLength) {
    const linkInfoSize = view.getUint32(offset, true);
    offset += linkInfoSize;
  }

  // StringData: NameString, RelativePath, WorkingDir, CommandLineArguments, IconLocation
  const hasName = (flags & 0x00000004) !== 0;
  const hasRelativePath = (flags & 0x00000008) !== 0;
  const hasWorkingDir = (flags & 0x00000010) !== 0;
  const hasArguments = (flags & 0x00000020) !== 0;
  const hasIconLocationFlag = (flags & 0x00000400) !== 0;

  // 跳过前面的字符串
  const skipString = () => {
    if (offset + 2 > buffer.byteLength) return;
    const len = view.getUint16(offset, true);
    offset += 2 + len * 2; // Unicode 字符串
  };

  if (hasName) skipString();
  if (hasRelativePath) skipString();
  if (hasWorkingDir) skipString();
  if (hasArguments) skipString();

  // IconLocation
  let iconPath = '';
  if (hasIconLocationFlag && offset + 2 <= buffer.byteLength) {
    const len = view.getUint16(offset, true);
    offset += 2;
    if (offset + len * 2 <= buffer.byteLength) {
      // 解码 UTF-16LE 字符串
      const chars: string[] = [];
      for (let i = 0; i < len; i++) {
        chars.push(String.fromCharCode(view.getUint16(offset + i * 2, true)));
      }
      iconPath = chars.join('');
    }
  }

  if (!iconPath) {
    throw new Error('快捷方式中未找到图标路径');
  }

  // iconPath 格式通常是 "C:\path\file.exe,0" 或 "file.exe,-1"
  const parts = iconPath.split(',');
  const filePath = parts[0].trim();
  const iconIndex = parts.length > 1 ? parseInt(parts[1]) || 0 : 0;

  // 返回提示信息（无法直接访问文件系统）
  throw new Error(
    `快捷方式指向图标：${filePath}${iconIndex !== 0 ? ` (索引 ${iconIndex})` : ''}。` +
    `由于浏览器安全限制，无法直接读取该文件。请直接上传 ${filePath.split('\\').pop()} 文件来提取图标。`
  );
}

// ===== 主处理函数 =====
function detectAndExtract(buffer: ArrayBuffer): ExtractedIcon[] {
  const view = new DataView(buffer);
  if (buffer.byteLength < 4) throw new Error('文件太小');

  // ICO: reserved=0, type=1
  if (buffer.byteLength >= 6) {
    const reserved = view.getUint16(0, true);
    const type = view.getUint16(2, true);
    if (reserved === 0 && type === 1) {
      return extractIconsFromICO(buffer);
    }
  }

  // PE (EXE/DLL)
  if (view.getUint16(0, true) === 0x5A4D) {
    return extractIconsFromPE(buffer);
  }

  // LNK
  if (buffer.byteLength >= 4 && view.getUint32(0, true) === 0x0000004C) {
    return extractIconFromLNK(buffer);
  }

  throw new Error('不支持的文件格式，支持：EXE、DLL、ICO、LNK 等');
}

export default function IconExtractPage() {
  const [file, setFile] = useState<File | null>(null);
  const [icons, setIcons] = useState<ExtractedIcon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setIcons([]);
    setError('');
    setLoading(true);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const results = detectAndExtract(buffer);
      if (results.length === 0) {
        throw new Error('未在文件中找到图标');
      }
      results.sort((a, b) => b.width - a.width);
      setIcons(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提取失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }, [processFile]);

  const handleDownload = (icon: ExtractedIcon) => {
    const a = document.createElement('a');
    a.href = icon.url;
    a.download = `${file?.name?.replace(/\.[^.]+$/, '') || 'icon'}_${icon.width}x${icon.height}.png`;
    a.click();
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
        <div className="text-center mb-8 animate-fade-in">
          <div className="text-4xl mb-3">🎯</div>
          <h2 className="text-2xl font-bold text-white mb-2">图标提取</h2>
          <p className="text-white/40 text-sm">从文件中提取高清图标，支持 EXE、DLL、ICO</p>
        </div>

        {/* 上传区域 */}
        <div
          className={`glass-card p-8 mb-6 animate-fade-in cursor-pointer transition-all ${isDragging ? 'border-[#fb6400] bg-[#fb6400]/10' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".exe,.dll,.ico,.cpl,.scr,.lnk,.ocx,.sys,.drv"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="text-center">
            <div className="text-4xl mb-3">{file ? '✅' : '📁'}</div>
            <h2 className="text-lg font-semibold text-white mb-2">
              {file ? file.name : '点击或拖拽上传文件'}
            </h2>
            <p className="text-white/40 text-sm">
              {file
                ? `${(file.size / 1024).toFixed(1)} KB · 点击重新选择`
                : '支持 EXE、DLL、ICO、LNK 等格式'}
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
          <div className="glass-card p-6 mb-6 animate-fade-in border border-red-500/30">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3l9.09 16H2.91L12 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-medium mb-1">提取失败</h3>
                <p className="text-sm text-white/50">{error}</p>
              </div>
            </div>
          </div>
        )}

        {icons.length > 0 && (
          <div className="glass-card p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">提取成功 · 共 {icons.length} 个图标</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {icons.map((icon, i) => (
                <div key={i} className="bg-white/5 rounded-xl p-4 text-center hover:bg-white/10 transition-colors">
                  <div className="flex items-center justify-center h-24 mb-3">
                    <img
                      src={icon.url}
                      alt={`${icon.width}x${icon.height}`}
                      className="max-w-full max-h-full"
                      style={{ imageRendering: icon.width <= 64 ? 'pixelated' : 'auto' }}
                    />
                  </div>
                  <p className="text-white text-sm font-medium mb-1">{icon.width} × {icon.height}</p>
                  <p className="text-white/40 text-xs mb-3">{(icon.size / 1024).toFixed(1)} KB</p>
                  <button
                    onClick={() => handleDownload(icon)}
                    className="w-full py-2 text-xs font-medium text-[#fb6400] bg-[#fb6400]/10 rounded-lg hover:bg-[#fb6400]/20 transition-colors"
                  >
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
            <li>• 支持 EXE、DLL、ICO、CPL、SCR 等 PE 格式文件</li>
            <li>• 自动提取最大尺寸的图标（通常是 256×256 高清版）</li>
            <li>• LNK 快捷方式可读取图标路径，但需手动上传目标文件</li>
            <li>• 文件仅在浏览器本地处理，不会上传到服务器</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
