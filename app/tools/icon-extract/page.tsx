'use client';
import { useToolHistory } from '@/lib/useToolHistory';

import { useState, useRef, useCallback } from 'react';
import BackButton from '@/components/BackButton';
import FullscreenButton from '@/components/FullscreenButton';

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
  const sectionStart = optOffset + optHeaderSize;

  // 资源目录 RVA 和 Size（DataDirectory 索引 2）
  const dataDirOffset = optOffset + (is64 ? 112 : 96);
  const resRVA = view.getUint32(dataDirOffset + 8, true);
  const resSize = view.getUint32(dataDirOffset + 12, true);

  // 构建 section map: RVA -> file offset
  type Section = { name: string; rva: number; size: number; raw: number };
  const sections: Section[] = [];
  for (let i = 0; i < numSections; i++) {
    const secOff = sectionStart + i * 40;
    if (secOff + 40 > buffer.byteLength) break;
    const nameBytes = new Uint8Array(buffer, secOff, 8);
    const name = new TextDecoder().decode(nameBytes).replace(/\0/g, '');
    sections.push({
      name,
      rva: view.getUint32(secOff + 12, true),
      size: view.getUint32(secOff + 16, true),
      raw: view.getUint32(secOff + 20, true),
    });
  }

  // RVA -> 文件偏移
  function rvaToFile(rva: number): number {
    for (const sec of sections) {
      if (rva >= sec.rva && rva < sec.rva + sec.size) {
        return sec.raw + (rva - sec.rva);
      }
    }
    return 0;
  }

  // 找到资源段的文件偏移
  let resFileBase = 0;

  // 方法1: 使用 DataDirectory 指向的 RVA
  if (resRVA !== 0 && resSize !== 0) {
    const candidate = rvaToFile(resRVA);
    if (candidate > 0 && candidate + 16 <= buffer.byteLength) {
      const numNamed = view.getUint16(candidate + 12, true);
      const numId = view.getUint16(candidate + 14, true);
      if (numNamed + numId > 0 && numNamed + numId < 1000) {
        resFileBase = candidate;
      }
    }
  }

  // 方法2: 直接查找 .rsrc 段
  if (resFileBase === 0) {
    const rsrcSection = sections.find((s) => s.name === '.rsrc');
    if (rsrcSection && rsrcSection.raw > 0 && rsrcSection.raw + 16 <= buffer.byteLength) {
      resFileBase = rsrcSection.raw;
    }
  }

  if (resFileBase === 0) {
    throw new Error('文件中未找到资源段');
  }

  // 读取资源目录，返回 { id, subOffset, isDir }[]
  // subOffset 是相对于 resFileBase 的偏移
  // 命名资源的 name 会被读取并尝试转为数字 ID（如 "100" -> 100）
  function readDir(fileOffset: number): { id: number; subOffset: number; isDir: boolean }[] {
    if (fileOffset + 16 > buffer.byteLength) return [];
    const numNamed = view.getUint16(fileOffset + 12, true);
    const numId = view.getUint16(fileOffset + 14, true);
    const entries: { id: number; subOffset: number; isDir: boolean }[] = [];
    for (let i = 0; i < numNamed + numId; i++) {
      const entryOff = fileOffset + 16 + i * 8;
      if (entryOff + 8 > buffer.byteLength) break;
      const nameOrId = view.getUint32(entryOff, true);
      const dataOrSubdir = view.getUint32(entryOff + 4, true);
      const isDir = (dataOrSubdir & 0x80000000) !== 0;
      let id: number;
      if (nameOrId & 0x80000000) {
        // 命名资源：读取名称字符串，尝试转为数字
        const nameStrOff = resFileBase + (nameOrId & 0x7FFFFFFF);
        if (nameStrOff + 2 > buffer.byteLength) continue;
        const nameLen = view.getUint16(nameStrOff, true);
        const chars: string[] = [];
        for (let j = 0; j < nameLen && nameStrOff + 2 + j * 2 < buffer.byteLength; j++) {
          chars.push(String.fromCharCode(view.getUint16(nameStrOff + 2 + j * 2, true)));
        }
        const nameStr = chars.join('');
        const parsed = parseInt(nameStr);
        id = isNaN(parsed) ? -1 - i : parsed; // 非数字名称用负数 ID
      } else {
        id = nameOrId;
      }
      entries.push({ id, subOffset: dataOrSubdir & 0x7FFFFFFF, isDir });
    }
    return entries;
  }

  // 读取 IMAGE_RESOURCE_DATA_ENTRY，返回数据的文件偏移和大小
  function readDataEntry(fileOffset: number): { dataFileOff: number; size: number } | null {
    if (fileOffset + 16 > buffer.byteLength) return null;
    const dataRVA = view.getUint32(fileOffset, true);
    const size = view.getUint32(fileOffset + 4, true);
    const dataFileOff = rvaToFile(dataRVA);
    if (dataFileOff === 0) return null;
    return { dataFileOff, size };
  }

  // === 第一层：读取资源类型目录 ===
  const typeEntries = readDir(resFileBase);

  // 找 RT_GROUP_ICON (14) 和 RT_ICON (3)
  const groupIconDir = typeEntries.find((e) => e.id === 14 && e.isDir);
  const iconDir = typeEntries.find((e) => e.id === 3 && e.isDir);

  if (!groupIconDir) {
    throw new Error('文件中未找到图标组资源（RT_GROUP_ICON）');
  }

  // === 收集所有 RT_ICON 数据 ===
  // iconId -> { fileOffset, size }
  const iconMap = new Map<number, { fileOffset: number; size: number }>();

  if (iconDir) {
    // 第二层：按名称遍历 RT_ICON
    const iconNames = readDir(resFileBase + iconDir.subOffset);
    for (const nameEntry of iconNames) {
      if (!nameEntry.isDir) continue;
      // 第三层：按语言遍历
      const langEntries = readDir(resFileBase + nameEntry.subOffset);
      for (const lang of langEntries) {
        if (lang.isDir) continue;
        const de = readDataEntry(resFileBase + lang.subOffset);
        if (de) {
          iconMap.set(nameEntry.id, { fileOffset: de.dataFileOff, size: de.size });
        }
      }
    }
  }

  // === 解析 RT_GROUP_ICON ===
  const groupNames = readDir(resFileBase + groupIconDir.subOffset);
  const results: ExtractedIcon[] = [];
  let groupCount = 0;
  let iconLookupFailures = 0;

  for (const nameEntry of groupNames) {
    if (!nameEntry.isDir) continue;
    const langEntries = readDir(resFileBase + nameEntry.subOffset);
    for (const lang of langEntries) {
      if (lang.isDir) continue;
      const de = readDataEntry(resFileBase + lang.subOffset);
      if (!de) continue;
      groupCount++;

      // GRPICONDIR 结构: reserved(2) + type(2) + count(2) + GRPICONDIRENTRY[] * 14
      if (de.dataFileOff + 6 > buffer.byteLength) continue;
      const count = view.getUint16(de.dataFileOff + 4, true);

      // 提取组内所有图标
      for (let i = 0; i < count; i++) {
        const entryOff = de.dataFileOff + 6 + i * 14;
        if (entryOff + 14 > buffer.byteLength) break;
        const w = view.getUint8(entryOff) || 256;
        const h = view.getUint8(entryOff + 1) || 256;
        const iconId = view.getUint16(entryOff + 12, true);

        const iconInfo = iconMap.get(iconId);
        if (!iconInfo) { iconLookupFailures++; continue; }

      // 读取图标原始数据
      const iconBuf = buffer.slice(iconInfo.fileOffset, iconInfo.fileOffset + iconInfo.size);
      const sig = new Uint8Array(iconBuf, 0, Math.min(4, iconBuf.byteLength));
      const isPng = sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4E && sig[3] === 0x47;

      if (isPng) {
        const blob = new Blob([iconBuf], { type: 'image/png' });
        results.push({ width: w, height: h, url: URL.createObjectURL(blob), format: 'PNG', size: blob.size });
      } else {
        // BMP 数据：构造完整 ICO 文件让浏览器渲染
        const icoHeader = new ArrayBuffer(6);
        const hv = new DataView(icoHeader);
        hv.setUint16(0, 0, true);
        hv.setUint16(2, 1, true);
        hv.setUint16(4, 1, true);

        const icoEntry = new ArrayBuffer(16);
        const ev = new DataView(icoEntry);
        ev.setUint8(0, w === 256 ? 0 : w);
        ev.setUint8(1, h === 256 ? 0 : h);
        ev.setUint16(4, 1, true);
        ev.setUint16(6, 32, true);
        ev.setUint32(8, iconBuf.byteLength, true);
        ev.setUint32(12, 22, true);

        const blob = new Blob([icoHeader, icoEntry, iconBuf], { type: 'image/x-icon' });
        results.push({ width: w, height: h, url: URL.createObjectURL(blob), format: 'ICO', size: iconBuf.byteLength });
      }
      } // end for each icon in group
    }
  }

  if (results.length === 0 && groupCount > 0) {
    throw new Error(`找到 ${groupCount} 个图标组，但未能提取到图标数据（${iconLookupFailures} 个图标 ID 未匹配）。该文件可能使用了特殊的资源格式。`);
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

  // 验证 LNK 签名
  if (buffer.byteLength < 76 || view.getUint32(0, true) !== 0x0000004C) {
    throw new Error('不是有效的快捷方式文件');
  }

  const flags = view.getUint32(20, true);

  // ShellLinkHeader 固定 76 字节
  let offset = 76;

  // 按 LNK 规范顺序处理：LinkTargetIDList → LinkInfo → StringData
  // 跳过 LinkTargetIDList（如果有）
  const hasTargetIDList = (flags & 0x00000001) !== 0;
  if (hasTargetIDList && offset + 2 <= buffer.byteLength) {
    const idListSize = view.getUint16(offset, true);
    offset += 2 + idListSize;
  }

  // 跳过 LinkInfo（如果有），同时提取目标路径
  let targetPath = '';
  const hasLinkInfo = (flags & 0x00000002) !== 0;
  if (hasLinkInfo && offset + 4 <= buffer.byteLength) {
    const linkInfoSize = view.getUint32(offset, true);
    const linkInfoHeaderSize = view.getUint32(offset + 4, true);
    const linkInfoFlags = view.getUint32(offset + 8, true);
    // 提取 LocalBasePath（目标路径，Windows 中文系统通常用 GBK 编码）
    if ((linkInfoFlags & 0x01) !== 0 && linkInfoHeaderSize >= 28) {
      const localBasePathOffset = view.getUint32(offset + 16, true);
      if (localBasePathOffset > 0 && offset + localBasePathOffset < buffer.byteLength) {
        const pathStart = offset + localBasePathOffset;
        const pathBytes: number[] = [];
        for (let i = pathStart; i < buffer.byteLength && i < pathStart + 520; i++) {
          const b = view.getUint8(i);
          if (b === 0) break;
          pathBytes.push(b);
        }
        try {
          targetPath = new TextDecoder('gbk').decode(new Uint8Array(pathBytes));
        } catch {
          targetPath = String.fromCharCode(...pathBytes);
        }
      }
    }
    if (linkInfoSize >= 4) {
      offset += linkInfoSize;
    }
  }

  // StringData: 按顺序读取 UTF-16LE 字符串
  const readString = (): string | null => {
    if (offset + 2 > buffer.byteLength) return null;
    const charCount = view.getUint16(offset, true);
    offset += 2;
    if (offset + charCount * 2 > buffer.byteLength) return null;
    const chars: string[] = [];
    for (let i = 0; i < charCount; i++) {
      chars.push(String.fromCharCode(view.getUint16(offset + i * 2, true)));
    }
    offset += charCount * 2;
    return chars.join('');
  };

  const skipString = () => { readString(); };

  // 读取 Name 字段（用于在没有路径时作为提示）
  let nameStr = '';
  if (flags & 0x00000004) {
    nameStr = readString() || '';
  }

  if (flags & 0x00000008) skipString(); // HasRelativePath
  if (flags & 0x00000010) skipString(); // HasWorkingDir
  if (flags & 0x00000020) skipString(); // HasArguments

  // 读取 IconLocation（如果有）
  let iconPath = '';
  if (flags & 0x00000400) {
    iconPath = readString() || '';
  }

  // 优先使用 iconPath，否则使用 targetPath
  const effectivePath = iconPath || targetPath;

  if (!effectivePath) {
    // 没有路径信息，但可能有 Name，提示用户
    throw new Error(JSON.stringify({
      type: 'lnk_no_path',
      name: nameStr,
      message: nameStr
        ? `快捷方式指向「${nameStr}」，但未找到完整文件路径。请右键查看快捷方式属性中的目标位置。`
        : '该快捷方式未包含目标路径信息，请右键查看属性中的目标位置。',
    }));
  }

  // 路径格式: "C:\path\file.exe,0" 或 "C:\path\file.exe"
  const parts = effectivePath.split(',');
  const fullPath = parts[0].trim();
  const iconIndex = parts.length > 1 ? parseInt(parts[1]) || 0 : 0;

  // 取文件所在目录（去掉末尾反斜杠后截取目录部分）
  const lastSep = Math.max(fullPath.lastIndexOf('\\'), fullPath.lastIndexOf('/'));
  const dirPath = lastSep > 0 ? fullPath.substring(0, lastSep + 1) : fullPath;
  const fileName = fullPath.split('\\').pop() || fullPath.split('/').pop() || fullPath;

  // 返回路径信息（UI 层处理显示）
  throw new Error(JSON.stringify({
    type: 'lnk_target',
    filePath: dirPath,
    fileName,
    iconIndex,
  }));
}

// ===== URL 快捷方式解析 (.url 文件是 INI 格式纯文本) =====
function extractIconFromURL(buffer: ArrayBuffer): ExtractedIcon[] {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);

  // 提取 IconFile 路径
  const iconFileMatch = text.match(/IconFile\s*=\s*(.+)/i);
  if (!iconFileMatch) {
    // 没有 IconFile，尝试从 URL= 提取网页信息
    throw new Error('该 .url 文件未指定图标文件（IconFile）');
  }

  const iconPath = iconFileMatch[1].trim();

  // 提取 IconIndex
  const iconIndexMatch = text.match(/IconIndex\s*=\s*(\d+)/i);
  const iconIndex = iconIndexMatch ? parseInt(iconIndexMatch[1]) : 0;

  // 路径格式: "C:\path\file.exe,0" 或 "C:\path\file.ico"
  const parts = iconPath.split(',');
  const fullPath = parts[0].trim();
  const lastSep = Math.max(fullPath.lastIndexOf('\\'), fullPath.lastIndexOf('/'));
  const dirPath = lastSep > 0 ? fullPath.substring(0, lastSep + 1) : fullPath;
  const fileName = fullPath.split('\\').pop() || fullPath.split('/').pop() || fullPath;

  // 返回路径信息（UI 层处理显示）
  throw new Error(JSON.stringify({
    type: 'lnk_target',
    filePath: dirPath,
    fileName,
    iconIndex,
  }));
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

  // URL (.url 文件是纯文本，检测 [InternetShortcut] 或 URL= 特征)
  try {
    const textStart = new TextDecoder('utf-8', { fatal: false })
      .decode(buffer.slice(0, Math.min(512, buffer.byteLength)));
    if (textStart.includes('[InternetShortcut]') || textStart.includes('URL=') || textStart.includes('IconFile=')) {
      return extractIconFromURL(buffer);
    }
  } catch { /* not text, continue */ }

  throw new Error('不支持的文件格式，支持：EXE、DLL、ICO、LNK、URL 等');
}

export default function IconExtractPage() {
  useToolHistory('icon-extract');
  const [file, setFile] = useState<File | null>(null);
  const [icons, setIcons] = useState<ExtractedIcon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [lnkTarget, setLnkTarget] = useState<{ filePath: string; fileName: string; iconIndex: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setIcons([]);
    setError('');
    setLnkTarget(null);
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
      const msg = err instanceof Error ? err.message : '提取失败';
      try {
        const parsed = JSON.parse(msg);
        if (parsed.type === 'lnk_target') {
          setLnkTarget(parsed);
        } else if (parsed.type === 'lnk_no_path') {
          setError(parsed.message || msg);
        } else {
          setError(msg);
        }
      } catch {
        setError(msg);
      }
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
        <FullscreenButton />
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-24 pb-16">
        <div className="text-center mb-8 animate-fade-in">
          <div className="text-4xl mb-3">🎯</div>
          <h2 className="text-2xl font-bold text-white mb-2">图标提取</h2>
          <p className="text-white/40 text-sm">从文件中提取高清图标，支持 EXE、DLL、ICO、LNK、URL</p>
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
            accept=".exe,.dll,.ico,.cpl,.scr,.lnk,.ocx,.sys,.drv,.url"
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
                : '支持 EXE、DLL、ICO、LNK、URL 等格式'}
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

        {/* LNK 快捷方式指引 */}
        {lnkTarget && (
          <div className="glass-card p-6 mb-6 animate-fade-in border border-[#fb6400]/30">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#fb6400]/20 flex items-center justify-center shrink-0">
                <span className="text-lg">🔗</span>
              </div>
              <div>
                <h3 className="text-white font-medium mb-1">快捷方式已解析</h3>
                <p className="text-sm text-white/50">浏览器无法直接读取本地文件，请按以下步骤操作：</p>
              </div>
            </div>

            {/* 操作步骤 */}
            <div className="space-y-3 mb-4">
              <div className="flex items-start gap-3 bg-white/5 rounded-xl px-4 py-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-[#fb6400]/20 text-[#fb6400] text-xs font-bold flex items-center justify-center">1</span>
                <div className="text-sm text-white/70">
                  <span className="text-white/90">复制下方路径</span>，在文件资源管理器的地址栏粘贴并回车
                </div>
              </div>
              <div className="flex items-start gap-3 bg-white/5 rounded-xl px-4 py-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-[#fb6400]/20 text-[#fb6400] text-xs font-bold flex items-center justify-center">2</span>
                <div className="text-sm text-white/70">
                  找到文件 <span className="text-white font-medium">{lnkTarget.fileName}</span>，将其拖入上方上传区域
                </div>
              </div>
            </div>

            {/* 路径 + 复制按钮 */}
            <div className="flex items-center gap-2 bg-black/30 rounded-xl px-4 py-3">
              <div className="flex-1 overflow-hidden">
                <p className="text-[10px] text-white/30 mb-1">文件路径</p>
                <p className="text-sm text-[#fb6400] font-mono truncate">{lnkTarget.filePath}</p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(lnkTarget.filePath);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-[#fb6400]/20 hover:bg-[#fb6400]/30 text-[#fb6400]"
              >
                {copied ? '✓ 已复制' : '复制路径'}
              </button>
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
            <li>• LNK 快捷方式可解析目标路径，引导你上传源文件提取图标</li>
            <li>• URL 快捷方式可读取 IconFile 路径，引导你提取图标</li>
            <li>• 文件仅在浏览器本地处理，不会上传到服务器</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
