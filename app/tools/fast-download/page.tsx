'use client';
import { useToolHistory } from '@/lib/useToolHistory';

import { useState, useCallback, useRef } from 'react';
import BackButton from '@/components/BackButton';
import FullscreenButton from '@/components/FullscreenButton';

interface ProbeResult {
  fileName: string;
  fileSize: number;
  supportsRange: boolean;
  contentType: string;
  error?: string;
  cloudService?: string;
}

interface ChunkProgress {
  id: number;
  loaded: number;
  total: number;
  done: boolean;
}

const THREAD_OPTIONS = [1, 2, 4, 8, 16, 32];
const DEFAULT_THREADS = 8;

// 客户端网盘链接检测
function detectCloudDrive(url: string): { service: string; serviceLabel: string; needsCode: boolean } | null {
  const patterns: Array<{ pattern: RegExp; service: string; serviceLabel: string; needsCode: boolean }> = [
    { pattern: /pan\.quark\.cn\/s\//, service: 'quark', serviceLabel: '夸克网盘', needsCode: false },
    { pattern: /aliyundrive\.com\/s\//, service: 'aliyun', serviceLabel: '阿里云盘', needsCode: false },
    { pattern: /www\.alipan\.com\/s\//, service: 'aliyun', serviceLabel: '阿里云盘', needsCode: false },
    { pattern: /pan\.baidu\.com\/s\//, service: 'baidu', serviceLabel: '百度网盘', needsCode: true },
    { pattern: /115\.com\/s\//, service: '115', serviceLabel: '115网盘', needsCode: true },
    { pattern: /cloud\.189\.cn\/share/, service: 'tianyi', serviceLabel: '天翼云盘', needsCode: false },
    { pattern: /xunlei\.com\/s\//, service: 'xunlei', serviceLabel: '迅雷云盘', needsCode: false },
  ];
  for (const p of patterns) {
    if (p.pattern.test(url)) {
      return { service: p.service, serviceLabel: p.serviceLabel, needsCode: p.needsCode };
    }
  }
  return null;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatSpeed(bytesPerSec: number): string {
  return formatSize(bytesPerSec) + '/s';
}

export default function FastDownloadPage() {
  useToolHistory('fast-download');
  const [url, setUrl] = useState('');
  const [extractionCode, setExtractionCode] = useState('');
  const [probing, setProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);
  const [threadCount, setThreadCount] = useState(DEFAULT_THREADS);
  const [downloading, setDownloading] = useState(false);
  const [chunks, setChunks] = useState<ChunkProgress[]>([]);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [error, setError] = useState('');
  const [cloudInfo, setCloudInfo] = useState<{ serviceLabel: string; needsCode: boolean } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const speedRef = useRef({ lastTime: Date.now(), lastLoaded: 0 });

  // 检测网盘链接
  const handleUrlChange = (value: string) => {
    setUrl(value);
    setProbeResult(null);
    setError('');
    const detected = detectCloudDrive(value);
    setCloudInfo(detected);
  };

  const handleProbe = useCallback(async () => {
    if (!url.trim()) return;
    setError('');
    setProbeResult(null);
    setProbing(true);

    try {
      const detected = detectCloudDrive(url.trim());

      if (detected) {
        // 网盘链接：先解析再探测
        const parseRes = await fetch('/api/fast-download/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url.trim(), code: extractionCode.trim() || undefined }),
        });
        const parseData = await parseRes.json();

        if (parseData.error) {
          setError(parseData.error + (parseData.details ? `\n${parseData.details}` : ''));
          setProbing(false);
          return;
        }

        // 用解析出的直链进行探测
        const probeRes = await fetch('/api/fast-download/probe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: parseData.downloadUrl }),
        });
        const probeData = await probeRes.json();

        if (probeData.error) {
          setError(`解析成功但探测失败: ${probeData.error}`);
        } else {
          // 保存直链用于后续下载
          (window as unknown as Record<string, unknown>).__cloudDirectUrl = parseData.downloadUrl;
          setProbeResult({
            ...probeData,
            cloudService: parseData.service,
          });
        }
      } else {
        // 普通直链：直接探测
        const res = await fetch('/api/fast-download/probe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url.trim() }),
        });
        const data = await res.json();
        if (data.error) {
          setError(data.error);
        } else {
          setProbeResult(data);
        }
      }
    } catch {
      setError('检测失败，请检查链接是否正确');
    } finally {
      setProbing(false);
    }
  }, [url, extractionCode]);

  const handleDownload = useCallback(async () => {
    if (!probeResult) return;

    // 获取实际下载地址（网盘直链或原始URL）
    const directUrl = (window as unknown as Record<string, unknown>).__cloudDirectUrl as string | undefined;
    const downloadUrl = directUrl || url.trim();

    if (!probeResult.supportsRange) {
      window.open(downloadUrl, '_blank');
      return;
    }

    const threads = threadCount;
    setDownloading(true);
    setError('');
    setTotalLoaded(0);
    setTotalSize(probeResult.fileSize);

    const fileSize = probeResult.fileSize;
    const chunkSize = Math.ceil(fileSize / threads);
    const initChunks: ChunkProgress[] = [];
    for (let i = 0; i < threads; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize - 1, fileSize - 1);
      if (start >= fileSize) break;
      initChunks.push({ id: i, loaded: 0, total: end - start + 1, done: false });
    }
    setChunks(initChunks);

    const abortController = new AbortController();
    abortRef.current = abortController;
    speedRef.current = { lastTime: Date.now(), lastLoaded: 0 };

    // 速度计算定时器
    const speedInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - speedRef.current.lastTime) / 1000;
      if (elapsed > 0) {
        const currentLoaded = initChunks.reduce((s, c) => s + c.loaded, 0);
        const bytesDiff = currentLoaded - speedRef.current.lastLoaded;
        setSpeed(bytesDiff / elapsed);
        speedRef.current = { lastTime: now, lastLoaded: currentLoaded };
      }
    }, 500);

    try {
      const buffers: (ArrayBuffer | null)[] = new Array(initChunks.length).fill(null);

      await Promise.all(
        initChunks.map(async (chunk) => {
          const start = chunk.id * chunkSize;
          const end = Math.min(start + chunkSize - 1, fileSize - 1);

          const res = await fetch('/api/fast-download/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: downloadUrl,
              start,
              end,
            }),
            signal: abortController.signal,
          });

          if (!res.ok) throw new Error(`分片 ${chunk.id + 1} 下载失败`);

          const reader = res.body?.getReader();
          if (!reader) throw new Error('无法读取响应流');

          const parts: Uint8Array[] = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            parts.push(value);
            chunk.loaded += value.byteLength;
            setTotalLoaded((prev) => prev + value.byteLength);
            setChunks([...initChunks]);
          }

          const totalLen = parts.reduce((s, p) => s + p.byteLength, 0);
          const merged = new Uint8Array(totalLen);
          let offset = 0;
          for (const part of parts) {
            merged.set(part, offset);
            offset += part.byteLength;
          }
          buffers[chunk.id] = merged.buffer;
          chunk.done = true;
          setChunks([...initChunks]);
        })
      );

      // 合并所有分片
      const validBuffers = buffers.filter((b): b is ArrayBuffer => b !== null);
      const totalLen = validBuffers.reduce((s, b) => s + b.byteLength, 0);
      const merged = new Uint8Array(totalLen);
      let offset = 0;
      for (const buf of validBuffers) {
        merged.set(new Uint8Array(buf), offset);
        offset += buf.byteLength;
      }

      // 触发浏览器下载
      const blob = new Blob([merged]);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = probeResult.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(`下载失败: ${(err as Error).message}`);
      }
    } finally {
      clearInterval(speedInterval);
      setDownloading(false);
      abortRef.current = null;
    }
  }, [url, probeResult, threadCount]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setDownloading(false);
  }, []);

  const progress = totalSize > 0 ? (totalLoaded / totalSize) * 100 : 0;

  return (
    <div className="min-h-screen relative z-10">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center">
          <BackButton toolId="fast-download" />
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="9943" className="w-8 h-8 rounded-lg shadow-lg shadow-orange-500/30" />
            <h1 className="text-lg font-semibold text-white">高速下载</h1>
          </div>
        </div>
        <FullscreenButton />
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-24 pb-16">
        <div className="text-center mb-8 animate-fade-in">
          <div className="text-4xl mb-3">⚡</div>
          <h2 className="text-2xl font-bold text-white mb-2">高速下载</h2>
          <p className="text-white/40 text-sm">多线程并行下载，充分利用带宽</p>
        </div>

        {/* 输入区域 */}
        <div className="glass-card p-6 mb-6 animate-fade-in">
          <h3 className="text-base font-semibold text-white mb-1">粘贴下载链接</h3>
          <p className="text-sm text-white/40 mb-4">支持 HTTP/HTTPS 直链和网盘分享链接（夸克/阿里/百度/115/天翼/迅雷）</p>

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !probing && handleProbe()}
                placeholder="粘贴下载链接或网盘分享链接..."
                className="w-full px-4 py-3 pr-20 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#fb6400] transition-all"
              />
              <button
                onClick={() => navigator.clipboard.readText().then(handleUrlChange).catch(() => {})}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs text-white/40 hover:text-[#fb6400] bg-white/5 rounded-lg transition-colors"
              >
                粘贴
              </button>
            </div>
            <button
              onClick={handleProbe}
              disabled={probing || !url.trim()}
              className="px-6 py-3 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white font-medium rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {probing ? '检测中...' : '检测'}
            </button>
          </div>

          {/* 网盘链接提示 + 提取码输入 */}
          {cloudInfo && (
            <div className="mt-3 flex items-center gap-3">
              <span className="px-2.5 py-1 text-xs font-medium bg-[#fb6400]/15 text-[#fb6400] rounded-lg border border-[#fb6400]/20">
                {cloudInfo.serviceLabel}
              </span>
              {cloudInfo.needsCode && (
                <input
                  type="text"
                  value={extractionCode}
                  onChange={(e) => setExtractionCode(e.target.value)}
                  placeholder="请输入提取码（如有）"
                  className="flex-1 px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#fb6400] transition-all"
                />
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* 检测结果 */}
        {probeResult && !downloading && (
          <div className="glass-card p-6 mb-6 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#fb6400]/20 flex items-center justify-center">
                <span className="text-lg">{probeResult.cloudService ? '☁️' : '📦'}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-medium">{probeResult.fileName}</h3>
                  {probeResult.cloudService && (
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-green-500/15 text-green-400 rounded-md border border-green-500/20">
                      {probeResult.cloudService} 已解析
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/40">
                  {formatSize(probeResult.fileSize)} · {probeResult.contentType || '未知类型'}
                </p>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/40">文件大小</span>
                <span className="text-white">{formatSize(probeResult.fileSize)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">多线程支持</span>
                <span className={probeResult.supportsRange ? 'text-green-400' : 'text-yellow-400'}>
                  {probeResult.supportsRange ? '支持' : '不支持'}
                </span>
              </div>
              {probeResult.supportsRange && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">预计加速</span>
                  <span className="text-[#fb6400]">最高 {threadCount}x</span>
                </div>
              )}
            </div>

            {/* 线程选择 */}
            {probeResult.supportsRange && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-white/60">选择线程数</span>
                  <span className="text-xs text-white/30">内存占用 ≈ {formatSize(probeResult.fileSize)}</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {THREAD_OPTIONS.map((t) => {
                    const isSelected = threadCount === t;
                    const chunkSize = Math.ceil(probeResult.fileSize / t);
                    return (
                      <button
                        key={t}
                        onClick={() => setThreadCount(t)}
                        className={`p-3 rounded-xl text-center transition-all ${
                          isSelected
                            ? 'bg-gradient-to-br from-[#fb6400] to-[#ff8c00] text-white shadow-lg shadow-orange-500/30'
                            : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div className="text-lg font-bold">{t}</div>
                        <div className="text-[10px] mt-0.5 opacity-70">线程</div>
                        <div className="text-[10px] mt-1 opacity-50">
                          {formatSize(chunkSize)}/片
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-white/25 mt-2 text-center">
                  线程越多速度越快，但内存占用越高。文件约 {formatSize(probeResult.fileSize)}，无论几线程内存占用相同
                </p>
              </div>
            )}

            <button
              onClick={handleDownload}
              className="w-full py-3 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white font-medium rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all active:scale-[0.98]"
            >
              {probeResult.supportsRange ? `${threadCount} 线程下载` : '直接下载'}
            </button>
          </div>
        )}

        {/* 下载进度 */}
        {downloading && (
          <div className="glass-card p-6 mb-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">下载中</h3>
              <button
                onClick={handleCancel}
                className="px-3 py-1 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                取消
              </button>
            </div>

            {/* 总进度条 */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/40">{formatSize(totalLoaded)} / {formatSize(totalSize)}</span>
                <span className="text-[#fb6400]">{progress.toFixed(1)}%</span>
              </div>
              <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#fb6400] to-[#ff8c00] rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* 速度 */}
            <div className="flex justify-between text-sm mb-4">
              <span className="text-white/40">当前速度</span>
              <span className="text-green-400 font-mono">{formatSpeed(speed)}</span>
            </div>

            {/* 分片状态 */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {chunks.map((chunk) => (
                <div
                  key={chunk.id}
                  className={`p-2 rounded-lg text-center text-xs ${
                    chunk.done
                      ? 'bg-green-500/20 text-green-400'
                      : chunk.loaded > 0
                      ? 'bg-[#fb6400]/20 text-[#fb6400]'
                      : 'bg-white/5 text-white/30'
                  }`}
                >
                  <div className="font-mono">{chunk.done ? '✓' : `${((chunk.loaded / chunk.total) * 100).toFixed(0)}%`}</div>
                  <div className="text-[10px] mt-0.5">线程 {chunk.id + 1}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 说明 */}
        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <h3 className="text-white font-semibold mb-3">💡 工作原理</h3>
          <ul className="space-y-2 text-white/50 text-sm">
            <li>• <strong className="text-white/70">直链下载</strong>：自动检测服务器是否支持分片下载（Range 请求），支持时多线程并行加速</li>
            <li>• <strong className="text-white/70">网盘解析</strong>：自动识别夸克/阿里/百度/115/天翼/迅雷网盘链接，解析为直链后加速下载</li>
            <li>• 多线程同时下载，充分利用你的带宽</li>
            <li>• 不支持分片时，回退为普通单线程下载</li>
            <li>• 注意：网盘解析需要配置 alist 服务，详见 .env.local 中的 ALIST_URL</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
