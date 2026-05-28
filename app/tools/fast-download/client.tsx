'use client';
import { useToolHistory } from '@/lib/useToolHistory';

import { useState, useCallback, useRef, useEffect } from 'react';
import BackButton from '@/components/BackButton';
import FullscreenButton from '@/components/FullscreenButton';

interface ProbeResult {
  fileName: string;
  fileSize: number;
  supportsRange: boolean;
  contentType: string;
  error?: string;
}

interface ChunkProgress {
  id: number;
  loaded: number;
  total: number;
  done: boolean;
}

const THREAD_OPTIONS = [1, 2, 4, 8, 16, 32];
const DEFAULT_THREADS = 8;

type DownloadMethod = 'aria2' | 'idm' | 'browser';

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
  const [probing, setProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);
  const [threadCount, setThreadCount] = useState(DEFAULT_THREADS);
  const [downloading, setDownloading] = useState(false);
  const [chunks, setChunks] = useState<ChunkProgress[]>([]);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const speedRef = useRef({ lastTime: Date.now(), lastLoaded: 0 });

  // 下载方式
  const [showDetails, setShowDetails] = useState(false);
  const [showIdmTutorial, setShowIdmTutorial] = useState(false);
  const [aria2Release, setAria2Release] = useState<{
    version: string;
    win64: { url: string; name: string; size: number } | null;
    win32: { url: string; name: string; size: number } | null;
  } | null>(null);
  const [aria2Downloading, setAria2Downloading] = useState(false);
  const [aria2DlProgress, setAria2DlProgress] = useState(0);
  const [aria2DlSpeed, setAria2DlSpeed] = useState(0);
  const [aria2DlLoaded, setAria2DlLoaded] = useState(0);
  const [aria2DlTotal, setAria2DlTotal] = useState(0);
  const aria2DlAbortRef = useRef<AbortController | null>(null);
  const aria2DlSpeedRef = useRef({ lastTime: 0, lastLoaded: 0 });
  const [method, setMethod] = useState<DownloadMethod>('browser');
  const [aria2Host, setAria2Host] = useState('localhost');
  const [aria2Port, setAria2Port] = useState('6800');
  const [aria2Secret, setAria2Secret] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // 从 localStorage 恢复配置（客户端挂载后）
  useEffect(() => {
    const saved = localStorage.getItem('fast-dl-method') as DownloadMethod;
    if (saved) setMethod(saved);
    const host = localStorage.getItem('fast-dl-aria2-host');
    if (host) setAria2Host(host);
    const port = localStorage.getItem('fast-dl-aria2-port');
    if (port) setAria2Port(port);
    const secret = localStorage.getItem('fast-dl-aria2-secret');
    if (secret) setAria2Secret(secret);
  }, []);

  // 持久化配置
  useEffect(() => { localStorage.setItem('fast-dl-method', method); }, [method]);
  useEffect(() => { localStorage.setItem('fast-dl-aria2-host', aria2Host); }, [aria2Host]);
  useEffect(() => { localStorage.setItem('fast-dl-aria2-port', aria2Port); }, [aria2Port]);
  useEffect(() => { localStorage.setItem('fast-dl-aria2-secret', aria2Secret); }, [aria2Secret]);

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setProbeResult(null);
    setError('');
    setSuccess('');
  };

  const handleProbe = useCallback(async () => {
    if (!url.trim()) return;
    setError('');
    setSuccess('');
    setProbeResult(null);
    setProbing(true);

    try {
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
    } catch {
      setError('检测失败，请检查链接是否正确');
    } finally {
      setProbing(false);
    }
  }, [url]);

  // aria2 RPC 调用
  const aria2Rpc = useCallback(async (method: string, params: unknown[]) => {
    const rpcUrl = `http://${aria2Host}:${aria2Port}/jsonrpc`;
    const id = Date.now().toString();
    const body: Record<string, unknown> = { jsonrpc: '2.0', id, method, params };
    if (aria2Secret) body.params = [`token:${aria2Secret}`, ...params];

    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'aria2 调用失败');
    return data.result;
  }, [aria2Host, aria2Port, aria2Secret]);

  // aria2 版本检测
  const [aria2Status, setAria2Status] = useState<'unknown' | 'ok' | 'error'>('unknown');
  const checkAria2 = useCallback(async () => {
    try {
      const ver = await aria2Rpc('aria2.getVersion', []);
      setAria2Status('ok');
      return ver;
    } catch {
      setAria2Status('error');
      return null;
    }
  }, [aria2Rpc]);

  // 方法切换时检测 aria2
  useEffect(() => {
    if (method === 'aria2') checkAria2();
  }, [method, checkAria2]);

  // 获取 aria2 最新版本信息
  const fetchAria2Release = useCallback(async () => {
    if (aria2Release) return;
    try {
      const res = await fetch('/api/fast-download/aria2-release');
      const data = await res.json();
      if (!data.error) setAria2Release(data);
    } catch { /* ignore */ }
  }, [aria2Release]);

  // aria2 选中时自动获取版本信息
  useEffect(() => {
    if (method === 'aria2' && aria2Status === 'error') fetchAria2Release();
  }, [method, aria2Status, fetchAria2Release]);

  // 下载 aria2 安装包（多线程）
  const downloadAria2 = useCallback(async (asset: { url: string; name: string; size: number }) => {
    setAria2Downloading(true);
    setAria2DlProgress(0);
    setAria2DlLoaded(0);
    setAria2DlTotal(asset.size);
    setAria2DlSpeed(0);

    const fileSize = asset.size;
    const threads = 8;
    const chunkSize = Math.ceil(fileSize / threads);

    const abortController = new AbortController();
    aria2DlAbortRef.current = abortController;
    aria2DlSpeedRef.current = { lastTime: Date.now(), lastLoaded: 0 };

    const speedInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - aria2DlSpeedRef.current.lastTime) / 1000;
      if (elapsed > 0) {
        const bytesDiff = aria2DlLoaded - aria2DlSpeedRef.current.lastLoaded;
        setAria2DlSpeed(bytesDiff / elapsed);
        aria2DlSpeedRef.current = { lastTime: now, lastLoaded: aria2DlLoaded };
      }
    }, 500);

    try {
      const buffers: (ArrayBuffer | null)[] = new Array(threads).fill(null);

      await Promise.all(
        Array.from({ length: threads }, async (_, i) => {
          const start = i * chunkSize;
          const end = Math.min(start + chunkSize - 1, fileSize - 1);
          if (start >= fileSize) return;

          const res = await fetch('/api/fast-download/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: asset.url, start, end }),
            signal: abortController.signal,
          });

          if (!res.ok) throw new Error(`分片 ${i + 1} 下载失败`);

          const reader = res.body?.getReader();
          if (!reader) throw new Error('无法读取响应流');

          const parts: Uint8Array[] = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            parts.push(value);
            setAria2DlLoaded((prev) => prev + value.byteLength);
          }

          const totalLen = parts.reduce((s, p) => s + p.byteLength, 0);
          const merged = new Uint8Array(totalLen);
          let offset = 0;
          for (const part of parts) {
            merged.set(part, offset);
            offset += part.byteLength;
          }
          buffers[i] = merged.buffer;
        })
      );

      const validBuffers = buffers.filter((b): b is ArrayBuffer => b !== null);
      const totalLen = validBuffers.reduce((s, b) => s + b.byteLength, 0);
      const merged = new Uint8Array(totalLen);
      let offset = 0;
      for (const buf of validBuffers) {
        merged.set(new Uint8Array(buf), offset);
        offset += buf.byteLength;
      }

      const blob = new Blob([merged]);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = asset.name;
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
      setAria2Downloading(false);
      aria2DlAbortRef.current = null;
    }
  }, [aria2DlLoaded]);

  const handleDownload = useCallback(async () => {
    if (!probeResult) return;
    const downloadUrl = url.trim();
    setError('');
    setSuccess('');

    if (method === 'aria2') {
      // aria2 RPC 下载
      try {
        const params: Record<string, string>[] = [];
        if (probeResult.fileName) params.push({ out: probeResult.fileName });

        const gid = await aria2Rpc('aria2.addUri', [[downloadUrl], ...params]);
        setSuccess(`已发送到 aria2，GID: ${gid}`);
      } catch (err) {
        setError(`aria2 下载失败: ${(err as Error).message}。请确认 aria2 已启动且 RPC 端口正确。`);
      }
      return;
    }

    if (method === 'idm') {
      // IDM 协议调用
      const idmUrl = `idm://dl/${encodeURIComponent(downloadUrl)}`;
      window.open(idmUrl, '_blank');
      setSuccess('已调用 IDM，请在 IDM 中查看下载任务');
      return;
    }

    // 浏览器多线程下载
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
            body: JSON.stringify({ url: downloadUrl, start, end }),
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

      const validBuffers = buffers.filter((b): b is ArrayBuffer => b !== null);
      const totalLen = validBuffers.reduce((s, b) => s + b.byteLength, 0);
      const merged = new Uint8Array(totalLen);
      let offset = 0;
      for (const buf of validBuffers) {
        merged.set(new Uint8Array(buf), offset);
        offset += buf.byteLength;
      }

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
  }, [url, probeResult, threadCount, method, aria2Rpc]);

  // 生成启动脚本并下载
  const downloadStartScript = useCallback((type: 'bat' | 'sh') => {
    let content: string;
    let filename: string;
    let mime: string;

    if (type === 'bat') {
      content = `@echo off
chcp 65001 >nul
title aria2 RPC 下载服务
echo ================================
echo   aria2 RPC 启动脚本
echo   端口: ${aria2Port}
echo ================================
echo.

:: 检查 aria2 是否已安装
where aria2c >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 aria2c，请先安装 aria2
    echo 下载地址: https://github.com/aria2/aria2/releases/latest
    echo.
    pause
    exit /b 1
)

echo [启动中] aria2 RPC 服务...
echo [地址] http://${aria2Host}:${aria2Port}/jsonrpc
echo.
echo 保持此窗口打开，关闭即停止服务
echo ================================
echo.

aria2c --enable-rpc --rpc-listen-port=${aria2Port} --rpc-allow-origin-all --dir=%USERPROFILE%\\Downloads --max-connection-per-server=16 --split=16 --min-split-size=1M`;
      filename = '启动aria2下载服务.bat';
      mime = 'application/bat';
    } else {
      content = `#!/bin/bash
echo "================================"
echo "  aria2 RPC 启动脚本"
echo "  端口: ${aria2Port}"
echo "================================"
echo ""

# 检查 aria2 是否已安装
if ! command -v aria2c &> /dev/null; then
    echo "[错误] 未找到 aria2c，请先安装:"
    echo "  macOS:  brew install aria2"
    echo "  Ubuntu: sudo apt install aria2"
    echo ""
    exit 1
fi

echo "[启动中] aria2 RPC 服务..."
echo "[地址] http://${aria2Host}:${aria2Port}/jsonrpc"
echo ""
echo "保持此终端打开，Ctrl+C 停止服务"
echo "================================"
echo ""

aria2c --enable-rpc --rpc-listen-port=${aria2Port} --rpc-allow-origin-all --dir="$HOME/Downloads" --max-connection-per-server=16 --split=16 --min-split-size=1M`;
      filename = 'start-aria2.sh';
      mime = 'application/x-sh';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [aria2Host, aria2Port]);

  // aria2 未连接时自动轮询检测
  useEffect(() => {
    if (method !== 'aria2' || aria2Status === 'ok') return;
    const timer = setInterval(checkAria2, 3000);
    return () => clearInterval(timer);
  }, [method, aria2Status, checkAria2]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setDownloading(false);
  }, []);

  const progress = totalSize > 0 ? (totalLoaded / totalSize) * 100 : 0;

  return (
    <div className="min-h-screen relative z-10">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl safe-area-top border-b border-white/10">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center">
          <BackButton category="life" />
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
          <p className="text-white/40 text-sm">调用本地下载器，充分利用带宽</p>
        </div>

        {/* 下载方式选择 */}
        <div className="glass-card p-6 mb-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">下载方式</h3>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-xs text-white/40 hover:text-[#fb6400] transition-colors"
            >
              {showSettings ? '收起设置' : '设置'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { key: 'browser' as const, label: '浏览器', desc: '无需安装，直接使用' },
              { key: 'aria2' as const, label: 'aria2', desc: '需安装，速度更快' },
              { key: 'idm' as const, label: 'IDM', desc: '需安装，Windows' },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setMethod(opt.key)}
                className={`p-3 rounded-xl text-center transition-all ${
                  method === opt.key
                    ? 'bg-gradient-to-br from-[#fb6400] to-[#ff8c00] text-white shadow-lg shadow-orange-500/30'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="text-sm font-bold">{opt.label}</div>
                <div className="text-[10px] mt-1 opacity-70">{opt.desc}</div>
              </button>
            ))}
          </div>

          {/* aria2 设置 */}
          {method === 'aria2' && showSettings && (
            <div className="bg-white/5 rounded-xl p-4 space-y-3 animate-slide-up">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-white/40 mb-1 block">主机</label>
                  <input
                    type="text"
                    value={aria2Host}
                    onChange={(e) => setAria2Host(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#fb6400]"
                  />
                </div>
                <div className="w-24">
                  <label className="text-xs text-white/40 mb-1 block">端口</label>
                  <input
                    type="text"
                    value={aria2Port}
                    onChange={(e) => setAria2Port(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#fb6400]"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">密钥（可选）</label>
                <input
                  type="password"
                  value={aria2Secret}
                  onChange={(e) => setAria2Secret(e.target.value)}
                  placeholder="aria2 RPC secret"
                  className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#fb6400]"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={checkAria2}
                  className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-[#fb6400] transition-colors"
                >
                  测试连接
                </button>
                <span className={`text-xs ${aria2Status === 'ok' ? 'text-green-400' : aria2Status === 'error' ? 'text-red-400' : 'text-white/30'}`}>
                  {aria2Status === 'ok' ? '连接成功' : aria2Status === 'error' ? '连接失败' : '未检测'}
                </span>
              </div>
              <p className="text-[10px] text-white/30">
                修改后点击「测试连接」确认。默认配置适用于大多数情况。
              </p>
            </div>
          )}

          {/* aria2 状态提示（非设置模式） */}
          {method === 'aria2' && !showSettings && (
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${aria2Status === 'ok' ? 'bg-green-400' : aria2Status === 'error' ? 'bg-red-400' : 'bg-white/20'}`} />
              <span className="text-xs text-white/40">
                {aria2Status === 'ok' ? `aria2 已连接 (${aria2Host}:${aria2Port})` : aria2Status === 'error' ? 'aria2 未连接' : '检测中...'}
              </span>
            </div>
          )}

          {/* aria2 未连接时的引导 */}
          {method === 'aria2' && aria2Status === 'error' && (
            <div className="mt-4 bg-[#fb6400]/10 border border-[#fb6400]/20 rounded-xl p-4 animate-slide-up">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[#fb6400] text-sm font-medium">aria2 未启动</span>
                <button
                  onClick={checkAria2}
                  className="ml-auto px-3 py-1 text-xs bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-[#fb6400] transition-colors"
                >
                  重新检测
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-[#fb6400]/20 text-[#fb6400] text-xs font-bold">1</span>
                  <div className="flex-1">
                    <p className="text-sm text-white/70 mb-2">下载 aria2（已安装请跳过）</p>
                    {aria2Release ? (
                      <div className="space-y-2">
                        <p className="text-xs text-white/40">最新版本：{aria2Release.version}</p>
                        <div className="flex flex-wrap gap-2">
                          {aria2Release.win64 && (
                            <button
                              onClick={() => downloadAria2(aria2Release.win64!)}
                              disabled={aria2Downloading}
                              className="px-3 py-1.5 text-xs bg-[#fb6400]/20 border border-[#fb6400]/30 rounded-lg text-[#fb6400] hover:bg-[#fb6400]/30 transition-colors disabled:opacity-50"
                            >
                              {aria2Downloading ? '下载中...' : `Win 64位 (${formatSize(aria2Release.win64.size)})`}
                            </button>
                          )}
                          {aria2Release.win32 && (
                            <button
                              onClick={() => downloadAria2(aria2Release.win32!)}
                              disabled={aria2Downloading}
                              className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-[#fb6400] transition-colors disabled:opacity-50"
                            >
                              Win 32位
                            </button>
                          )}
                        </div>
                        {aria2Downloading && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-white/40">{formatSize(aria2DlLoaded)} / {formatSize(aria2DlTotal)}</span>
                              <span className="text-[#fb6400]">{aria2DlTotal > 0 ? ((aria2DlLoaded / aria2DlTotal) * 100).toFixed(1) : 0}%</span>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#fb6400] to-[#ff8c00] rounded-full transition-all duration-300"
                                style={{ width: `${aria2DlTotal > 0 ? (aria2DlLoaded / aria2DlTotal) * 100 : 0}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-white/30 mt-1">速度：{formatSpeed(aria2DlSpeed)}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-white/30">正在获取版本信息...</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-[#fb6400]/20 text-[#fb6400] text-xs font-bold">2</span>
                  <div>
                    <p className="text-sm text-white/70 mb-2">解压后运行启动脚本</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => downloadStartScript('bat')}
                        className="px-3 py-1.5 text-xs bg-[#fb6400]/20 border border-[#fb6400]/30 rounded-lg text-[#fb6400] hover:bg-[#fb6400]/30 transition-colors"
                      >
                        下载 .bat 脚本（Windows）
                      </button>
                      <button
                        onClick={() => downloadStartScript('sh')}
                        className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-[#fb6400] transition-colors"
                      >
                        下载 .sh 脚本（Mac/Linux）
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-[#fb6400]/20 text-[#fb6400] text-xs font-bold">3</span>
                  <p className="text-sm text-white/70">运行脚本后，本页会自动检测连接</p>
                </div>
              </div>
            </div>
          )}

          {/* IDM 未安装时的教程 */}
          {method === 'idm' && (
            <div className="mt-4 bg-[#fb6400]/10 border border-[#fb6400]/20 rounded-xl p-4 animate-slide-up">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[#fb6400] text-sm font-medium">IDM 使用教程</span>
                <button
                  onClick={() => setShowIdmTutorial(!showIdmTutorial)}
                  className="ml-auto px-3 py-1 text-xs bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-[#fb6400] transition-colors"
                >
                  {showIdmTutorial ? '收起' : '展开教程'}
                </button>
              </div>

              <div
                className="transition-all duration-500 ease-in-out"
                style={{
                  maxHeight: showIdmTutorial ? '800px' : '0px',
                  opacity: showIdmTutorial ? 1 : 0,
                  overflow: 'hidden',
                }}
              >
                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-[#fb6400]/20 text-[#fb6400] text-xs font-bold">1</span>
                    <div>
                      <p className="text-sm text-white/70 mb-1">下载安装 IDM</p>
                      <p className="text-xs text-white/40 mb-2">IDM 是付费软件，$24.95 终身授权，有 30 天免费试用</p>
                      <a
                        href="https://www.internetdownloadmanager.com/download.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#fb6400] hover:underline"
                      >
                        IDM 官网下载
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                      <p className="text-[10px] text-white/30 mt-1">安装后需要购买授权或使用试用版</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-[#fb6400]/20 text-[#fb6400] text-xs font-bold">2</span>
                    <div>
                      <p className="text-sm text-white/70 mb-1">安装浏览器扩展</p>
                      <p className="text-xs text-white/50">IDM 安装后会自动提示安装浏览器扩展。如果没有提示：</p>
                      <ul className="text-xs text-white/40 mt-1 ml-3 space-y-0.5">
                        <li>• Chrome：在 IDM 安装目录找到 <code className="text-[#fb6400]">IDMGCExt.crx</code>，拖入扩展页面</li>
                        <li>• Firefox：在附加组件中搜索 "IDM Integration Module"</li>
                        <li>• Edge：在扩展商店搜索 "IDM Integration Module"</li>
                      </ul>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-[#fb6400]/20 text-[#fb6400] text-xs font-bold">3</span>
                    <div>
                      <p className="text-sm text-white/70 mb-1">配置 IDM</p>
                      <ul className="text-xs text-white/40 ml-3 space-y-0.5">
                        <li>• 打开 IDM → 选项 → 连接</li>
                        <li>• 最大连接数改为 <strong className="text-white/60">16</strong>（或更高）</li>
                        <li>• 勾选 "使用多段下载"</li>
                      </ul>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-[#fb6400]/20 text-[#fb6400] text-xs font-bold">4</span>
                    <div>
                      <p className="text-sm text-white/70 mb-1">开始下载</p>
                      <p className="text-xs text-white/50">安装完成后，回到本页粘贴下载链接，点击"调用 IDM 下载"即可。IDM 会自动接管下载，多线程跑满带宽。</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 输入区域 */}
        <div className="glass-card p-6 mb-6 animate-fade-in">
          <h3 className="text-base font-semibold text-white mb-1">粘贴下载链接</h3>
          <p className="text-sm text-white/40 mb-4">支持 HTTP/HTTPS 直链下载地址</p>

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !probing && handleProbe()}
                placeholder="粘贴下载链接..."
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

          {error && (
            <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-sm text-green-400">
              {success}
            </div>
          )}
        </div>

        {/* 检测结果 */}
        {probeResult && !downloading && (
          <div className="glass-card p-6 mb-6 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#fb6400]/20 flex items-center justify-center">
                <span className="text-lg">📦</span>
              </div>
              <div>
                <h3 className="text-white font-medium">{probeResult.fileName}</h3>
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
                <span className="text-white/40">分片下载</span>
                <span className={probeResult.supportsRange ? 'text-green-400' : 'text-yellow-400'}>
                  {probeResult.supportsRange ? '支持' : '不支持'}
                </span>
              </div>
              {method === 'browser' && probeResult.supportsRange && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">预计加速</span>
                  <span className="text-[#fb6400]">最高 {threadCount}x</span>
                </div>
              )}
            </div>

            {/* 线程选择（仅浏览器模式） */}
            {method === 'browser' && probeResult.supportsRange && (
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
              </div>
            )}

            <button
              onClick={handleDownload}
              disabled={method === 'aria2' && aria2Status === 'error'}
              className="w-full py-3 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white font-medium rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {method === 'aria2' ? '发送到 aria2' : method === 'idm' ? '调用 IDM 下载' : (probeResult.supportsRange ? `${threadCount} 线程下载` : '直接下载')}
            </button>
          </div>
        )}

        {/* 下载进度（仅浏览器模式） */}
        {downloading && method === 'browser' && (
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

            <div className="flex justify-between text-sm mb-4">
              <span className="text-white/40">当前速度</span>
              <span className="text-green-400 font-mono">{formatSpeed(speed)}</span>
            </div>

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

        {/* 详情介绍 */}
        <div className="glass-card animate-slide-up overflow-hidden" style={{ animationDelay: '100ms' }}>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full px-6 py-4 flex items-center justify-between group transition-colors hover:bg-white/5"
          >
            <span className="text-white/60 text-sm group-hover:text-[#fb6400] transition-colors">详情介绍</span>
            <svg
              className={`w-4 h-4 text-white/30 transition-transform duration-300 ${showDetails ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div
            className="transition-all duration-500 ease-in-out"
            style={{
              maxHeight: showDetails ? '1200px' : '0px',
              opacity: showDetails ? 1 : 0,
              overflow: 'hidden',
            }}
          >
            <div className="px-6 pb-6 space-y-6">
              {/* 对比表格 */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-white/40 py-2 pr-3 font-normal">对比项</th>
                      <th className="text-center text-white/40 py-2 px-2 font-normal">浏览器</th>
                      <th className="text-center text-[#fb6400] py-2 px-2 font-normal">aria2</th>
                      <th className="text-center text-white/40 py-2 px-2 font-normal">IDM</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/60">
                    <tr className="border-b border-white/5">
                      <td className="py-2 pr-3 text-white/40">需要安装</td>
                      <td className="text-center py-2 px-2 text-green-400">不需要</td>
                      <td className="text-center py-2 px-2 text-yellow-400">需要</td>
                      <td className="text-center py-2 px-2 text-yellow-400">需要</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-2 pr-3 text-white/40">占用资源</td>
                      <td className="text-center py-2 px-2 text-green-400">无</td>
                      <td className="text-center py-2 px-2 text-yellow-400">~50MB 内存</td>
                      <td className="text-center py-2 px-2 text-yellow-400">~30MB 内存</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-2 pr-3 text-white/40">下载速度</td>
                      <td className="text-center py-2 px-2">受服务器限制</td>
                      <td className="text-center py-2 px-2 text-green-400">跑满带宽</td>
                      <td className="text-center py-2 px-2 text-green-400">跑满带宽</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-2 pr-3 text-white/40">多线程</td>
                      <td className="text-center py-2 px-2">服务器中转</td>
                      <td className="text-center py-2 px-2 text-green-400">本地直连</td>
                      <td className="text-center py-2 px-2 text-green-400">本地直连</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-2 pr-3 text-white/40">BT/磁力</td>
                      <td className="text-center py-2 px-2 text-red-400">不支持</td>
                      <td className="text-center py-2 px-2 text-green-400">支持</td>
                      <td className="text-center py-2 px-2 text-red-400">不支持</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-2 pr-3 text-white/40">大文件</td>
                      <td className="text-center py-2 px-2 text-yellow-400">可能内存溢出</td>
                      <td className="text-center py-2 px-2 text-green-400">磁盘直写</td>
                      <td className="text-center py-2 px-2 text-green-400">磁盘直写</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 text-white/40">支持平台</td>
                      <td className="text-center py-2 px-2">全平台</td>
                      <td className="text-center py-2 px-2">全平台</td>
                      <td className="text-center py-2 px-2">仅 Windows</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* aria2 优势 */}
              <div>
                <p className="text-white/70 font-medium mb-2 text-sm">aria2 的优势</p>
                <ul className="space-y-1.5 text-white/50 text-xs ml-3">
                  <li>• 开源免费，无广告无捆绑，社区活跃持续更新</li>
                  <li>• 支持 HTTP/HTTPS/FTP/SFTP/BT/磁力链等多种协议</li>
                  <li>• 本地多线程直连源服务器，跑满你的带宽</li>
                  <li>• 支持断点续传，下载中断后从上次位置继续</li>
                  <li>• 跨平台：Windows/macOS/Linux/Android 均可使用</li>
                  <li>• 资源占用低，后台静默运行，不影响其他工作</li>
                </ul>
              </div>

              {/* IDM 优势 */}
              <div>
                <p className="text-white/70 font-medium mb-2 text-sm">IDM 的优势</p>
                <ul className="space-y-1.5 text-white/50 text-xs ml-3">
                  <li>• 自动嗅探浏览器中的下载链接，点击即捕获</li>
                  <li>• 内置站点抓取功能，可批量下载网页中的所有文件</li>
                  <li>• 自动多线程分割，无需手动配置线程数</li>
                  <li>• 下载完成后自动调用杀毒软件扫描</li>
                  <li>• 图形界面操作简单，适合不熟悉命令行的用户</li>
                </ul>
              </div>

              {/* BT/磁力解释 */}
              <div>
                <p className="text-white/70 font-medium mb-2 text-sm">什么是 BT/磁力？</p>
                <div className="text-white/50 text-xs ml-3 space-y-2">
                  <p>BT（BitTorrent）是一种点对点文件分享技术。与传统下载不同，BT 不是从一台服务器下载整个文件，而是从多个用户那里同时下载文件的不同片段。下载的人越多，速度越快。</p>
                  <p>磁力链接（magnet:）是 BT 的一种链接形式，通过文件的唯一哈希值来定位资源，不需要依赖种子文件服务器。即使原始发布者下架了文件，只要网络中还有人持有该文件，就可以继续下载。</p>
                  <p>简单说：普通下载是从一个地方拿文件，BT/磁力是从很多人那里拼文件，人越多越快。</p>
                </div>
              </div>

              {/* aria2 启动命令 */}
              <div className="p-3 bg-white/5 rounded-lg">
                <p className="text-xs text-white/40 mb-1">aria2 快速启动命令：</p>
                <code className="text-xs text-[#fb6400] break-all">aria2c --enable-rpc --rpc-listen-port=6800 --rpc-allow-origin-all</code>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
