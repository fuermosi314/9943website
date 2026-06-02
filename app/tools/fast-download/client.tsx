'use client';
import { useToolHistory } from '@/lib/useToolHistory';

import { useState, useCallback, useRef, useEffect } from 'react';
import BackButton from '@/components/BackButton';
import FullscreenButton from '@/components/FullscreenButton';
import { saveDownloadState, getDownloadState, deleteDownloadState } from '@/lib/download-db';

interface ProbeResult {
  fileName: string;
  fileSize: number;
  supportsRange: boolean;
  supportsCors: boolean;
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

// GitHub 镜像代理列表
const GITHUB_MIRRORS = [
  { name: 'ghproxy', prefix: 'https://mirror.ghproxy.com/' },
  { name: 'gh-proxy', prefix: 'https://gh-proxy.com/' },
];

function isGitHubReleasesUrl(u: string): boolean {
  return /^https?:\/\/github\.com\/[^/]+\/[^/]+\/releases\/download\//.test(u);
}

function getMirrorUrls(u: string): { name: string; url: string }[] {
  return GITHUB_MIRRORS.map(m => ({ name: m.name, url: m.prefix + u }));
}

// 测试镜像，返回最快 URL（失败返回原始 URL）
async function resolveBestMirror(u: string): Promise<string> {
  if (!isGitHubReleasesUrl(u)) return u;
  const mirrors = getMirrorUrls(u);
  const candidates = [{ name: '原始', url: u }, ...mirrors];
  const results: { url: string; time: number }[] = [];
  await Promise.all(candidates.map(async (c) => {
    try {
      const t = Date.now();
      const r = await fetch(c.url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(5000) });
      if (r.ok || r.status === 302 || r.status === 301) {
        results.push({ url: c.url, time: Date.now() - t });
      }
    } catch {}
  }));
  if (results.length === 0) return u;
  results.sort((a, b) => a.time - b.time);
  return results[0].url;
}

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

  // 自动测速 & 断点续传
  const [autoThreadCount, setAutoThreadCount] = useState<number | null>(null);
  const [speedTesting, setSpeedTesting] = useState(false);
  const [speedTestResult, setSpeedTestResult] = useState<{ best: number; speeds: Record<number, number> } | null>(null);
  // 自动选择的下载通道: aria2 | cors | proxy
  const [autoChannel, setAutoChannel] = useState<'aria2' | 'cors' | 'proxy'>('proxy');
  // 最终使用的下载 URL（可能是镜像）
  const [bestUrl, setBestUrl] = useState('');
  const [mirrorTesting, setMirrorTesting] = useState(false);
  const [resumeState, setResumeState] = useState<{
    url: string;
    fileName: string;
    fileSize: number;
    threadCount: number;
    completedChunks: boolean[];
    chunkBuffers: ArrayBuffer[];
  } | null>(null);

  // 下载方式
  const [aria2Release, setAria2Release] = useState<{
    version: string;
    win64: { url: string; name: string; size: number } | null;
    win32: { url: string; name: string; size: number } | null;
  } | null>(null);
  const [aria2DlStatus, setAria2DlStatus] = useState<'idle' | 'downloading' | 'done'>('idle');
  const [aria2DlProgress, setAria2DlProgress] = useState({ loaded: 0, total: 0 });
  const [aria2DirectStatus, setAria2DirectStatus] = useState<'idle' | 'downloading' | 'done'>('idle');
  const [aria2DirectProgress, setAria2DirectProgress] = useState({ loaded: 0, total: 0 });
  const [idmRelease, setIdmRelease] = useState<{ url: string; version: string } | null>(null);
  const [idmDlStatus, setIdmDlStatus] = useState<'idle' | 'downloading' | 'done'>('idle');
  const [idmDlProgress, setIdmDlProgress] = useState({ loaded: 0, total: 0 });
  const [idmDirectStatus, setIdmDirectStatus] = useState<'idle' | 'downloading' | 'done'>('idle');
  const [idmDirectProgress, setIdmDirectProgress] = useState({ loaded: 0, total: 0 });
  const [method, setMethod] = useState<DownloadMethod>('browser');
  const [aria2Host, setAria2Host] = useState('');
  const [aria2Port, setAria2Port] = useState('6800');
  const [aria2Secret, setAria2Secret] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showAria2Intro, setShowAria2Intro] = useState(false);
  const [aria2PathHint, setAria2PathHint] = useState('');

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
    const hint = localStorage.getItem('fast-dl-aria2-path-hint');
    if (hint) setAria2PathHint(hint);
  }, []);

  // 持久化配置
  useEffect(() => { localStorage.setItem('fast-dl-method', method); }, [method]);
  useEffect(() => { localStorage.setItem('fast-dl-aria2-host', aria2Host); }, [aria2Host]);
  useEffect(() => { localStorage.setItem('fast-dl-aria2-port', aria2Port); }, [aria2Port]);
  useEffect(() => { localStorage.setItem('fast-dl-aria2-secret', aria2Secret); }, [aria2Secret]);
  useEffect(() => { localStorage.setItem('fast-dl-aria2-path-hint', aria2PathHint); }, [aria2PathHint]);

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setProbeResult(null);
    setError('');
    setSuccess('');
  };

  // 自动测速：测试不同线程数的下载速度，选最快的
  // direct=true 时浏览器直连（CORS），false 时走服务器代理
  const runSpeedTest = useCallback(async (downloadUrl: string, fileSize: number, direct: boolean) => {
    if (fileSize < 1024 * 1024) {
      setAutoThreadCount(4);
      return;
    }

    setSpeedTesting(true);
    setSpeedTestResult(null);

    const TEST_CHUNK_SIZE = 512 * 1024;
    const threadOptions = [1, 2, 4, 8, 16, 32];
    const speeds: Record<number, number> = {};

    try {
      for (const threads of threadOptions) {
        if (threads * TEST_CHUNK_SIZE > fileSize) break;

        const chunkPerThread = Math.ceil(TEST_CHUNK_SIZE / threads);
        const start = Date.now();

        await Promise.all(
          Array.from({ length: threads }, (_, i) => {
            const chunkStart = i * chunkPerThread;
            const chunkEnd = Math.min(chunkStart + chunkPerThread - 1, TEST_CHUNK_SIZE - 1);
            if (chunkStart >= TEST_CHUNK_SIZE) return Promise.resolve();

            const fetchPromise = direct
              ? fetch(downloadUrl, { headers: { Range: `bytes=${chunkStart}-${chunkEnd}` } })
              : fetch('/api/fast-download/download', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url: downloadUrl, start: chunkStart, end: chunkEnd }),
                });

            return fetchPromise.then(async (res) => {
              const reader = res.body?.getReader();
              if (!reader) return;
              while (true) {
                const { done } = await reader.read();
                if (done) break;
              }
            });
          })
        );

        const elapsed = (Date.now() - start) / 1000;
        speeds[threads] = TEST_CHUNK_SIZE / elapsed;
      }

      let bestThreads = 1;
      let bestSpeed = 0;
      for (const [t, s] of Object.entries(speeds)) {
        if (s > bestSpeed) {
          bestSpeed = s;
          bestThreads = Number(t);
        }
      }

      if (speeds[16] && speeds[8] && speeds[16] < speeds[8] * 1.2) {
        bestThreads = Math.min(bestThreads, 8);
      }

      setSpeedTestResult({ best: bestThreads, speeds });
      setAutoThreadCount(bestThreads);
      setThreadCount(bestThreads);
    } catch {
      setAutoThreadCount(DEFAULT_THREADS);
    } finally {
      setSpeedTesting(false);
    }
  }, []);

  // 检查是否有未完成的下载（断点续传）
  const checkResume = useCallback(async (downloadUrl: string) => {
    try {
      const state = await getDownloadState(downloadUrl);
      if (state && state.completedChunks.some(c => c) && !state.completedChunks.every(c => c)) {
        setResumeState({
          url: state.url,
          fileName: state.fileName,
          fileSize: state.fileSize,
          threadCount: state.threadCount,
          completedChunks: state.completedChunks,
          chunkBuffers: state.chunkBuffers,
        });
      }
    } catch { /* ignore */ }
  }, []);

  // GitHub 镜像测速：测试原链接和镜像，选最快的
  const testGitHubMirrors = useCallback(async (originalUrl: string) => {
    setMirrorTesting(true);
    const mirrors = getMirrorUrls(originalUrl);
    const candidates = [{ name: '原始链接', url: originalUrl }, ...mirrors];
    const speeds: { name: string; url: string; speed: number }[] = [];

    try {
      // 并行测试所有候选源
      await Promise.all(candidates.map(async (candidate) => {
        try {
          const start = Date.now();
          const res = await fetch(candidate.url, {
            method: 'HEAD',
            redirect: 'follow',
            signal: AbortSignal.timeout(8000),
          });
          const elapsed = (Date.now() - start) / 1000;
          // HEAD 请求成功就算可用，用响应时间作为速度指标（越小越好）
          if (res.ok || res.status === 302 || res.status === 301) {
            speeds.push({ name: candidate.name, url: candidate.url, speed: 1 / elapsed });
          }
        } catch { /* 该源不可用 */ }
      }));

      if (speeds.length > 0) {
        // 按速度排序，选最快的
        speeds.sort((a, b) => b.speed - a.speed);
        const fastest = speeds[0];
        setBestUrl(fastest.url);
        if (fastest.name !== '原始链接') {
          setSuccess(`已自动切换到 ${fastest.name} 镜像（更快）`);
        }
      } else {
        setBestUrl(originalUrl);
      }
    } catch {
      setBestUrl(originalUrl);
    } finally {
      setMirrorTesting(false);
    }
  }, []);

  // aria2 RPC 调用：先尝试浏览器直连，失败再走服务端代理
  const aria2Rpc = useCallback(async (method: string, params: unknown[]) => {
    const host = aria2Host || 'localhost';
    const rpcBody = { jsonrpc: '2.0', id: Date.now().toString(), method, params: aria2Secret ? [`token:${aria2Secret}`, ...params] : params };

    // 1. 尝试浏览器直连
    try {
      const directRes = await fetch(`http://${host}:${aria2Port}/jsonrpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rpcBody),
        signal: AbortSignal.timeout(3000),
      });
      const data = await directRes.json();
      if (!data.error) {
        console.log('[aria2] 直连成功');
        return data.result;
      }
      console.log('[aria2] 直连返回错误:', data.error);
    } catch (e) {
      console.log('[aria2] 直连失败:', e instanceof Error ? e.message : e);
    }

    // 2. 走服务端代理
    try {
      console.log('[aria2] 尝试服务端代理...');
      const res = await fetch('/api/aria2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port: aria2Port, secret: aria2Secret, method, params }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      console.log('[aria2] 代理成功');
      return data.result;
    } catch (e) {
      console.log('[aria2] 代理失败:', e instanceof Error ? e.message : e);
      throw new Error('无法连接 aria2。如果是本机使用，请通过 http://localhost:3000 访问网站');
    }
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

  // 探测链接（在 checkResume、runSpeedTest、aria2Status 之后定义，因为依赖它们）
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
        setResumeState(null);
        setSpeedTestResult(null);
        setAutoThreadCount(null);
        setBestUrl('');
        checkResume(url.trim());

        // GitHub releases 链接：自动测速镜像
        const trimmedUrl = url.trim();
        if (isGitHubReleasesUrl(trimmedUrl)) {
          testGitHubMirrors(trimmedUrl);
        } else {
          setBestUrl(trimmedUrl);
        }

        // 自动选择最优通道
        if (aria2Status === 'ok') {
          setAutoChannel('aria2');
          setMethod('aria2');
        } else if (data.supportsCors && data.supportsRange) {
          setAutoChannel('cors');
          setMethod('browser');
          runSpeedTest(url.trim(), data.fileSize, true); // true = CORS 直连测速
        } else if (data.supportsRange) {
          setAutoChannel('proxy');
          setMethod('browser');
          runSpeedTest(url.trim(), data.fileSize, false); // false = 代理测速
        } else {
          setAutoChannel('proxy');
          setMethod('browser');
        }
      }
    } catch {
      setError('检测失败，请检查链接是否正确');
    } finally {
      setProbing(false);
    }
  }, [url, method, checkResume, runSpeedTest, aria2Status, testGitHubMirrors]);

  // 页面加载时自动检测 aria2
  useEffect(() => {
    checkAria2();
  }, [checkAria2]);

  // 获取 aria2 最新版本信息
  const fetchAria2Release = useCallback(async () => {
    if (aria2Release) return;
    try {
      const res = await fetch('/api/fast-download/aria2-release');
      const data = await res.json();
      if (!data.error) setAria2Release(data);
    } catch { /* ignore */ }
  }, [aria2Release]);

  // aria2 未连接时自动获取版本信息（用于安装引导）
  useEffect(() => {
    if (aria2Status === 'error') fetchAria2Release();
  }, [aria2Status, fetchAria2Release]);

  // 多线程下载 aria2 安装包（自动选择最快镜像）
  const downloadAria2Pkg = useCallback(async (asset: { url: string; name: string; size: number }) => {
    setAria2DlStatus('downloading');
    setAria2DlProgress({ loaded: 0, total: asset.size });
    const downloadUrl = await resolveBestMirror(asset.url);
    const fileSize = asset.size;
    const threads = 8;
    const chunkSize = Math.ceil(fileSize / threads);
    const chunkLoaded = new Array(threads).fill(0);
    const maxRetry = 3;

    try {
      const buffers: (ArrayBuffer | null)[] = new Array(threads).fill(null);

      await Promise.all(
        Array.from({ length: threads }, async (_, i) => {
          const start = i * chunkSize;
          const end = Math.min(start + chunkSize - 1, fileSize - 1);
          if (start >= fileSize) return;

          for (let attempt = 0; attempt < maxRetry; attempt++) {
            try {
              const res = await fetch('/api/fast-download/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: downloadUrl, start, end }),
                signal: AbortSignal.timeout(60000),
              });

              if (!res.ok) throw new Error(`分片 ${i + 1} HTTP ${res.status}`);
              const reader = res.body?.getReader();
              if (!reader) throw new Error('无法读取响应流');

              const parts: Uint8Array[] = [];
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                parts.push(value);
                chunkLoaded[i] += value.byteLength;
                const total = chunkLoaded.reduce((s, c) => s + c, 0);
                setAria2DlProgress({ loaded: total, total: fileSize });
              }

              const totalLen = parts.reduce((s, p) => s + p.byteLength, 0);
              const merged = new Uint8Array(totalLen);
              let offset = 0;
              for (const part of parts) {
                merged.set(part, offset);
                offset += part.byteLength;
              }
              buffers[i] = merged.buffer;
              break; // success
            } catch {
              if (attempt === maxRetry - 1) throw new Error(`分片 ${i + 1} 重试 ${maxRetry} 次后失败`);
              await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            }
          }
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
      setAria2DlStatus('done');
    } catch (err) {
      setAria2DlStatus('idle');
      setError(`aria2 下载失败: ${(err as Error).message}，请点击重试`);
    }
  }, []);

  // 获取 IDM 最新下载链接
  const fetchIdmRelease = useCallback(async () => {
    if (idmRelease) return;
    try {
      const res = await fetch('/api/fast-download/idm-release');
      const data = await res.json();
      if (!data.error) setIdmRelease(data);
    } catch { /* ignore */ }
  }, [idmRelease]);

  // 页面加载时获取 IDM 下载链接（用于设置中的安装引导）
  useEffect(() => {
    fetchIdmRelease();
  }, [fetchIdmRelease]);

  // 多线程下载 IDM 安装包
  const downloadIdmPkg = useCallback(async () => {
    if (!idmRelease) return;
    setIdmDlStatus('downloading');
    setIdmDlProgress({ loaded: 0, total: 0 });

    try {
      // 先探测文件大小
      const probeRes = await fetch('/api/fast-download/probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: idmRelease.url }),
      });
      const probeData = await probeRes.json();
      if (probeData.error) throw new Error(probeData.error);

      const fileSize = probeData.fileSize;
      setIdmDlProgress({ loaded: 0, total: fileSize });
      const threads = 8;
      const chunkSize = Math.ceil(fileSize / threads);
      const chunkLoaded = new Array(threads).fill(0);

      const buffers: (ArrayBuffer | null)[] = new Array(threads).fill(null);

      await Promise.all(
        Array.from({ length: threads }, async (_, i) => {
          const start = i * chunkSize;
          const end = Math.min(start + chunkSize - 1, fileSize - 1);
          if (start >= fileSize) return;

          const res = await fetch('/api/fast-download/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: idmRelease.url, start, end }),
          });

          if (!res.ok) throw new Error(`分片 ${i + 1} 失败`);
          const reader = res.body?.getReader();
          if (!reader) throw new Error('无法读取响应流');

          const parts: Uint8Array[] = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            parts.push(value);
            chunkLoaded[i] += value.byteLength;
            const total = chunkLoaded.reduce((s, c) => s + c, 0);
            setIdmDlProgress({ loaded: total, total: fileSize });
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
      a.download = `idm${idmRelease.version.replace('.', '')}.exe`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      setIdmDlStatus('done');
    } catch {
      setIdmDlStatus('idle');
      setIdmDlProgress({ loaded: 0, total: 0 });
      setError('IDM 下载失败，请重试');
    }
  }, [idmRelease]);

  // 原链接直连下载 aria2（不经服务器中转，自动镜像加速 + 重试）
  const downloadAria2Direct = useCallback(async (asset: { url: string; name: string; size: number }) => {
    setAria2DirectStatus('downloading');
    setAria2DirectProgress({ loaded: 0, total: asset.size });
    const downloadUrl = await resolveBestMirror(asset.url);
    const maxRetry = 3;

    for (let attempt = 0; attempt < maxRetry; attempt++) {
      try {
        const res = await fetch(downloadUrl, { signal: AbortSignal.timeout(60000) });
        if (!res.ok) throw new Error(`请求失败: ${res.status}`);

        const reader = res.body?.getReader();
        if (!reader) throw new Error('无法读取响应流');

        const totalSize = Number(res.headers.get('content-length')) || asset.size;
        setAria2DirectProgress({ loaded: 0, total: totalSize });

        const parts: Uint8Array[] = [];
        let loaded = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          parts.push(value);
          loaded += value.byteLength;
          setAria2DirectProgress({ loaded, total: totalSize });
        }

        const totalLen = parts.reduce((s, p) => s + p.byteLength, 0);
        const merged = new Uint8Array(totalLen);
        let offset = 0;
        for (const part of parts) {
          merged.set(part, offset);
          offset += part.byteLength;
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
        setAria2DirectStatus('done');
        return; // success
      } catch {
        if (attempt === maxRetry - 1) {
          setAria2DirectStatus('idle');
          setAria2DirectProgress({ loaded: 0, total: 0 });
          setError(`原链接下载失败（重试 ${maxRetry} 次），请用加速下载或手动下载`);
          return;
        }
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }, []);

  // 原链接直连下载 IDM（不经服务器中转）
  const downloadIdmDirect = useCallback(async () => {
    if (!idmRelease) return;
    setIdmDirectStatus('downloading');
    setIdmDirectProgress({ loaded: 0, total: 0 });

    try {
      const res = await fetch(idmRelease.url);
      if (!res.ok) throw new Error(`请求失败: ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error('无法读取响应流');

      const totalSize = Number(res.headers.get('content-length')) || 0;
      setIdmDirectProgress({ loaded: 0, total: totalSize });

      const parts: Uint8Array[] = [];
      let loaded = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value);
        loaded += value.byteLength;
        setIdmDirectProgress({ loaded, total: totalSize });
      }

      const totalLen = parts.reduce((s, p) => s + p.byteLength, 0);
      const merged = new Uint8Array(totalLen);
      let offset = 0;
      for (const part of parts) {
        merged.set(part, offset);
        offset += part.byteLength;
      }

      const blob = new Blob([merged]);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `idm${idmRelease.version.replace('.', '')}.exe`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      setIdmDirectStatus('done');
    } catch {
      setIdmDirectStatus('idle');
      setIdmDirectProgress({ loaded: 0, total: 0 });
      setError('原链接下载失败，请重试');
    }
  }, [idmRelease]);

  const handleDownload = useCallback(async () => {
    if (!probeResult) return;
    const downloadUrl = bestUrl || url.trim();
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

    // 浏览器多线程下载（支持断点续传）
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

    // 初始化分片状态（支持续传：从 resumeState 恢复已完成的分片）
    const initChunks: ChunkProgress[] = [];
    const buffers: (ArrayBuffer | null)[] = new Array(threads).fill(null);
    let initialLoaded = 0;

    for (let i = 0; i < threads; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize - 1, fileSize - 1);
      if (start >= fileSize) break;
      const chunkTotal = end - start + 1;

      if (resumeState && resumeState.completedChunks[i]) {
        // 此分片已完成，从缓存恢复
        initChunks.push({ id: i, loaded: chunkTotal, total: chunkTotal, done: true });
        buffers[i] = resumeState.chunkBuffers[i] || null;
        if (buffers[i]) initialLoaded += buffers[i]!.byteLength;
      } else {
        // 此分片需要下载（续传时可能有部分进度）
        const partialLoaded = resumeState?.chunkBuffers[i]?.byteLength || 0;
        initChunks.push({ id: i, loaded: partialLoaded, total: chunkTotal, done: false });
        if (resumeState?.chunkBuffers[i]) {
          buffers[i] = resumeState.chunkBuffers[i];
          initialLoaded += partialLoaded;
        }
      }
    }
    setChunks(initChunks);
    setTotalLoaded(initialLoaded);
    setResumeState(null); // 清除续传状态

    // 保存下载状态到 IndexedDB（用于续传）
    const saveState = () => {
      saveDownloadState({
        url: downloadUrl,
        fileName: probeResult.fileName,
        fileSize,
        contentType: probeResult.contentType,
        threadCount: threads,
        chunkBuffers: buffers.filter((b): b is ArrayBuffer => b !== null),
        completedChunks: initChunks.map(c => c.done),
        startedAt: Date.now(),
        updatedAt: Date.now(),
      }).catch(() => {});
    };

    const abortController = new AbortController();
    abortRef.current = abortController;
    speedRef.current = { lastTime: Date.now(), lastLoaded: initialLoaded };

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
      // 只下载未完成的分片
      const pendingChunks = initChunks.filter(c => !c.done);
      let saveCounter = 0;

      await Promise.all(
        pendingChunks.map(async (chunk) => {
          const start = chunk.id * chunkSize + chunk.loaded; // 从已下载的位置继续
          const end = Math.min(chunk.id * chunkSize + chunkSize - 1, fileSize - 1);

          if (start > end) return; // 已完成

          const res = autoChannel === 'cors'
            ? await fetch(downloadUrl, {
                headers: { Range: `bytes=${start}-${end}` },
                signal: abortController.signal,
              })
            : await fetch('/api/fast-download/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: downloadUrl, start, end }),
                signal: abortController.signal,
              });

          if (!res.ok) throw new Error(`分片 ${chunk.id + 1} 下载失败`);

          const reader = res.body?.getReader();
          if (!reader) throw new Error('无法读取响应流');

          // 如果有部分数据，先合并
          const parts: Uint8Array[] = [];
          if (buffers[chunk.id]) {
            parts.push(new Uint8Array(buffers[chunk.id]!));
          }

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            parts.push(value);
            chunk.loaded += value.byteLength;
            setTotalLoaded((prev) => prev + value.byteLength);
            setChunks([...initChunks]);

            // 每 20 个 chunk 保存一次状态（防止中断丢失太多进度）
            saveCounter++;
            if (saveCounter % 20 === 0) {
              // 合并当前分片数据到 buffers
              const totalLen = parts.reduce((s, p) => s + p.byteLength, 0);
              const merged = new Uint8Array(totalLen);
              let off = 0;
              for (const part of parts) {
                merged.set(part, off);
                off += part.byteLength;
              }
              buffers[chunk.id] = merged.buffer;
              saveState();
            }
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
          saveState();
        })
      );

      // 全部完成，合并并下载
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

      // 下载完成，删除 IndexedDB 中的状态
      deleteDownloadState(downloadUrl).catch(() => {});
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        // 下载失败，保存当前进度（断点续传）
        saveState();
        setError(`下载失败，已保存进度，可点击「继续下载」重试`);
      }
    } finally {
      clearInterval(speedInterval);
      setDownloading(false);
      abortRef.current = null;
    }
  }, [url, probeResult, threadCount, method, aria2Rpc, resumeState, autoChannel, bestUrl]);

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

:: 查找 aria2c.exe
set "ARIA2C="
for %%P in ("%ProgramFiles%\\aria2\\aria2c.exe" "%ProgramFiles(x86)%\\aria2\\aria2c.exe" "%USERPROFILE%\\Downloads\\aria2-*-win-64bit\\aria2c.exe" "%USERPROFILE%\\Downloads\\aria2\\aria2c.exe" ".\\aria2c.exe") do if exist %%P (set "ARIA2C=%%~P" & goto :found)
where aria2c >nul 2>&1 && (set "ARIA2C=aria2c" & goto :found)
echo [错误] 未找到 aria2c.exe，请确认已解压 aria2
echo 下载地址: https://github.com/aria2/aria2/releases/latest
echo.
pause
exit /b 1
:found
echo [找到] %ARIA2C%
for %%F in ("%ARIA2C%") do cd /d "%%~dpF"

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

  // 复制启动命令到剪贴板
  const searchHint = aria2PathHint.trim().replace(/\\+$/, '');
  const hintSearch = searchHint ? `if not defined ARIA2C for /f "delims=" %F in ('where /r "${searchHint}" aria2c.exe') do set "ARIA2C=%F"\n` : '';
  const aria2StartCmd = `set "ARIA2C="
for %P in ("%ProgramFiles%\\aria2\\aria2c.exe" "%ProgramFiles(x86)%\\aria2\\aria2c.exe" "%USERPROFILE%\\Downloads\\aria2\\aria2c.exe" ".\\aria2c.exe") do if not defined ARIA2C if exist %P set "ARIA2C=%~P"
${hintSearch}for %D in (C D E F G H) do if not defined ARIA2C if exist %D:\\ for /f "delims=" %F in ('where /r %D:\\ aria2c.exe') do if not defined ARIA2C set "ARIA2C=%F"
if not defined ARIA2C echo [错误] 未找到 aria2c.exe && pause && exit /b 1
echo [找到] %ARIA2C%
for %Z in ("%ARIA2C%") do cd /d "%~dpZ"
"%ARIA2C%" --enable-rpc --rpc-listen-port=${aria2Port} --rpc-allow-origin-all --dir=%USERPROFILE%\\Downloads --max-connection-per-server=16 --split=16 --min-split-size=1M`;
  const [copied, setCopied] = useState(false);
  const copyStartCommand = useCallback(() => {
    const ta = document.createElement('textarea');
    ta.value = aria2StartCmd;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [aria2StartCmd]);

  // 下载开机自启脚本
  const downloadAutoStartScript = useCallback(() => {
    // Windows VBS：静默启动 aria2（无 cmd 窗口）
    const vbsContent = `Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c aria2c --enable-rpc --rpc-listen-port=${aria2Port} --rpc-allow-origin-all --dir=%USERPROFILE%\\Downloads --max-connection-per-server=16 --split=16 --min-split-size=1M", 0, False`;
    const blob = new Blob([vbsContent], { type: 'application/vbs' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aria2-开机自启.vbs';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [aria2Port]);

  // aria2 未连接时自动轮询检测
  useEffect(() => {
    if (aria2Status === 'ok') return;
    const timer = setInterval(checkAria2, 5000);
    return () => clearInterval(timer);
  }, [aria2Status, checkAria2]);

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
          <FullscreenButton className="ml-auto" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-24 pb-16">
        <div className="text-center mb-8 animate-fade-in">
          <div className="text-4xl mb-3">⚡</div>
          <h2 className="text-2xl font-bold text-white mb-2">高速下载</h2>
          <p className="text-white/40 text-sm">自动测速选最优线程，断点续传不丢进度</p>
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

          {/* 下载通道状态 */}
          <div className="mt-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${aria2Status === 'ok' ? 'bg-green-400' : 'bg-white/20'}`} />
              <span className="text-white/40">
                {aria2Status === 'ok' ? `aria2 已连接` : aria2Status === 'error' ? 'aria2 未检测到' : '检测中...'}
              </span>
              <button
                onClick={() => setShowAria2Intro(!showAria2Intro)}
                className="text-white/20 hover:text-[#fb6400] transition-colors underline"
              >
                介绍
              </button>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-white/30 hover:text-[#fb6400] transition-colors"
            >
              {showSettings ? '收起设置' : '进行配置'}
            </button>
          </div>

          {/* aria2 介绍面板 */}
          {showAria2Intro && (
            <div className="mt-3 bg-[#fb6400]/5 border border-[#fb6400]/10 rounded-xl p-4 animate-slide-up">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#fb6400] text-xs font-medium">什么是 aria2？</span>
                <button onClick={() => setShowAria2Intro(false)} className="text-white/20 hover:text-white/50 text-xs">收起</button>
              </div>
              <div className="space-y-2 text-[11px] text-white/50 leading-relaxed">
                <p>aria2 是一款开源免费的命令行下载工具，支持 HTTP/HTTPS/FTP/BT/磁力链等多种协议，是目前最强大的下载加速方案。</p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-green-400 text-[10px] font-medium mb-1">核心优势</p>
                    <ul className="space-y-0.5 text-[10px] text-white/40">
                      <li>• 本地多线程直连，跑满带宽</li>
                      <li>• 支持断点续传</li>
                      <li>• 支持 BT/磁力链</li>
                      <li>• 资源占用低（~50MB）</li>
                    </ul>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-yellow-400 text-[10px] font-medium mb-1">vs 浏览器下载</p>
                    <ul className="space-y-0.5 text-[10px] text-white/40">
                      <li>• 浏览器：单线程，速度受限</li>
                      <li>• aria2：多线程直连，满速</li>
                      <li>• 浏览器：大文件可能内存溢出</li>
                      <li>• aria2：磁盘直写，无限制</li>
                    </ul>
                  </div>
                </div>
                <p className="text-white/30 text-[10px]">安装后本页会自动检测连接，无需手动配置。</p>
              </div>
            </div>
          )}

          {/* 进行配置（aria2 配置 + 安装引导） */}
          {showSettings && (
            <div className="mt-3 bg-white/5 rounded-xl p-4 space-y-3 animate-slide-up">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-white/40 mb-1 block">aria2 主机</label>
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

              {/* aria2 未连接时的安装引导 */}
              {aria2Status === 'error' && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[#fb6400] text-xs font-medium">aria2 安装引导</span>
                    <button
                      onClick={checkAria2}
                      className="ml-auto px-2 py-0.5 text-[10px] bg-white/5 border border-white/10 rounded text-white/40 hover:text-[#fb6400] transition-colors"
                    >
                      重新检测
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-[#fb6400]/20 text-[#fb6400] text-[10px] font-bold">1</span>
                      <div className="flex-1">
                        <p className="text-xs text-white/60 mb-1.5">下载 aria2（已安装请跳过）</p>
                        {aria2Release ? (
                          <div className="space-y-2">
                            <p className="text-[10px] text-white/30">最新版本：{aria2Release.version}</p>
                            {/* Windows 64位 */}
                            <div className="flex flex-wrap gap-2">
                              {aria2Release.win64 && (
                                <button
                                  onClick={() => downloadAria2Pkg(aria2Release.win64!)}
                                  disabled={aria2DlStatus === 'downloading' || aria2DirectStatus === 'downloading'}
                                  className="px-2 py-1 text-[10px] bg-[#fb6400]/20 border border-[#fb6400]/30 rounded text-[#fb6400] hover:bg-[#fb6400]/30 transition-colors disabled:opacity-50"
                                >
                                  {aria2DlStatus === 'downloading' ? '下载中...' : `Win 64位 加速下载`}
                                </button>
                              )}
                              {aria2Release.win64 && (
                                <button
                                  onClick={() => downloadAria2Direct(aria2Release.win64!)}
                                  disabled={aria2DlStatus === 'downloading' || aria2DirectStatus === 'downloading'}
                                  className="px-2 py-1 text-[10px] bg-white/5 border border-white/10 rounded text-white/40 hover:text-[#fb6400] transition-colors disabled:opacity-50"
                                >
                                  {aria2DirectStatus === 'downloading' ? '下载中...' : aria2DirectStatus === 'done' ? '下载完成 ✓' : 'Win 64位 原链接'}
                                </button>
                              )}
                            </div>
                            {/* Windows 32位 */}
                            <div className="flex flex-wrap gap-2">
                              {aria2Release.win32 && (
                                <button
                                  onClick={() => downloadAria2Pkg(aria2Release.win32!)}
                                  disabled={aria2DlStatus === 'downloading' || aria2DirectStatus === 'downloading'}
                                  className="px-2 py-1 text-[10px] bg-[#fb6400]/20 border border-[#fb6400]/30 rounded text-[#fb6400] hover:bg-[#fb6400]/30 transition-colors disabled:opacity-50"
                                >
                                  {aria2DlStatus === 'downloading' ? '下载中...' : `Win 32位 加速下载`}
                                </button>
                              )}
                              {aria2Release.win32 && (
                                <button
                                  onClick={() => downloadAria2Direct(aria2Release.win32!)}
                                  disabled={aria2DlStatus === 'downloading' || aria2DirectStatus === 'downloading'}
                                  className="px-2 py-1 text-[10px] bg-white/5 border border-white/10 rounded text-white/40 hover:text-[#fb6400] transition-colors disabled:opacity-50"
                                >
                                  {aria2DirectStatus === 'downloading' ? '下载中...' : aria2DirectStatus === 'done' ? '下载完成 ✓' : 'Win 32位 原链接'}
                                </button>
                              )}
                            </div>
                            {/* macOS / Linux */}
                            <div className="p-2 bg-white/5 rounded-lg">
                              <p className="text-[10px] text-white/30 mb-1">macOS / Linux 用户：</p>
                              <code className="text-[10px] text-[#fb6400]">brew install aria2</code>
                              <span className="text-[10px] text-white/30"> 或 </span>
                              <code className="text-[10px] text-[#fb6400]">sudo apt install aria2</code>
                            </div>
                            {(aria2DlStatus === 'downloading' && aria2DlProgress.total > 0) && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px] text-white/40">
                                  <span>{formatSize(aria2DlProgress.loaded)} / {formatSize(aria2DlProgress.total)}</span>
                                  <span>{((aria2DlProgress.loaded / aria2DlProgress.total) * 100).toFixed(1)}%</span>
                                </div>
                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-[#fb6400] to-[#ff8c00] rounded-full transition-all duration-300" style={{ width: `${(aria2DlProgress.loaded / aria2DlProgress.total) * 100}%` }} />
                                </div>
                              </div>
                            )}
                            {(aria2DirectStatus === 'downloading' && aria2DirectProgress.total > 0) && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px] text-white/40">
                                  <span>{formatSize(aria2DirectProgress.loaded)} / {formatSize(aria2DirectProgress.total)}</span>
                                  <span>{((aria2DirectProgress.loaded / aria2DirectProgress.total) * 100).toFixed(1)}%</span>
                                </div>
                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full bg-white/20 rounded-full transition-all duration-300" style={{ width: `${(aria2DirectProgress.loaded / aria2DirectProgress.total) * 100}%` }} />
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-[10px] text-white/30">正在获取版本信息...</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-[#fb6400]/20 text-[#fb6400] text-[10px] font-bold">2</span>
                      <div className="flex-1">
                        <p className="text-xs text-white/60 mb-1.5">启动 aria2</p>
                        <div className="space-y-2">
                          {/* 路径提示 */}
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={aria2PathHint}
                              onChange={(e) => setAria2PathHint(e.target.value)}
                              placeholder="aria2 所在目录（可选，如 D:\Tools）"
                              className="flex-1 px-2 py-1 text-[10px] bg-white/5 border border-white/10 rounded text-white placeholder:text-white/30 focus:outline-none focus:border-[#fb6400]"
                            />
                            <span className="text-[10px] text-white/30">填了搜得更快</span>
                          </div>
                          {/* 一键复制命令 */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={copyStartCommand}
                              className="px-2 py-1 text-[10px] bg-[#fb6400]/20 border border-[#fb6400]/30 rounded text-[#fb6400] hover:bg-[#fb6400]/30 transition-colors"
                            >
                              {copied ? '已复制 ✓' : '复制启动命令'}
                            </button>
                            <span className="text-[10px] text-white/30">粘贴到终端运行（Win: Win+R 输入 cmd；Mac: 搜索"终端"）</span>
                          </div>
                          {/* 启动脚本下载 */}
                          <div className="flex items-center gap-2">
                            <button onClick={() => downloadStartScript('bat')} className="px-2 py-1 text-[10px] bg-white/5 border border-white/10 rounded text-white/40 hover:text-[#fb6400] transition-colors">下载 .bat 脚本</button>
                            <button onClick={() => downloadStartScript('sh')} className="px-2 py-1 text-[10px] bg-white/5 border border-white/10 rounded text-white/40 hover:text-[#fb6400] transition-colors">下载 .sh 脚本</button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-[#fb6400]/20 text-[#fb6400] text-[10px] font-bold">3</span>
                      <div className="flex-1">
                        <p className="text-xs text-white/60 mb-1.5">开机自启（可选）</p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={downloadAutoStartScript}
                            className="px-2 py-1 text-[10px] bg-green-500/10 border border-green-500/20 rounded text-green-400 hover:bg-green-500/20 transition-colors"
                          >
                            下载开机自启脚本
                          </button>
                          <span className="text-[10px] text-white/30">下载后放到 aria2 同目录，双击运行一次即可</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-[#fb6400]/20 text-[#fb6400] text-[10px] font-bold">4</span>
                      <p className="text-xs text-white/60">运行后本页会自动检测连接</p>
                    </div>
                  </div>
                </div>
              )}

              {/* aria2 启动命令 */}
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
              <div className="flex justify-between text-sm">
                <span className="text-white/40">下载通道</span>
                <span className="text-[#fb6400]">
                  {autoChannel === 'aria2' ? 'aria2 本地多线程' : autoChannel === 'cors' ? `浏览器直连 ${autoThreadCount || '...'} 线程` : `服务器中转 ${autoThreadCount || '...'} 线程`}
                </span>
              </div>
            </div>

            {/* 服务器中转大文件提示 */}
            {autoChannel === 'proxy' && probeResult.fileSize > 100 * 1024 * 1024 && aria2Status !== 'ok' && (
              <div className="mt-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-xs text-yellow-400 leading-relaxed">
                当前走服务器中转，多线程加速效果有限。大文件建议使用 aria2 本地多线程直连，可跑满带宽。
                <button
                  onClick={() => setShowAria2Intro(true)}
                  className="ml-1 underline hover:text-yellow-300 transition-colors"
                >
                  了解 aria2
                </button>
              </div>
            )}

            {/* GitHub 镜像测速 */}
            {mirrorTesting && (
              <div className="mb-4 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-blue-400">正在测试 GitHub 镜像速度...</span>
              </div>
            )}

            {/* 测速状态 */}
            {speedTesting && (
              <div className="mb-4 bg-[#fb6400]/10 border border-[#fb6400]/20 rounded-xl p-3 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-[#fb6400] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-[#fb6400]">正在自动测速选最优线程...</span>
              </div>
            )}

            {/* 断点续传提示 */}
            {resumeState && autoChannel !== 'aria2' && (
              <div className="mb-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-center gap-2">
                <span className="text-yellow-400 text-xs">检测到未完成的下载，点击继续</span>
                <button
                  onClick={() => { deleteDownloadState(url.trim()).catch(() => {}); setResumeState(null); }}
                  className="ml-auto text-[10px] text-white/30 hover:text-red-400 transition-colors"
                >
                  清除缓存
                </button>
              </div>
            )}

            <button
              onClick={handleDownload}
              disabled={speedTesting || mirrorTesting}
              className="w-full py-3 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white font-medium rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mirrorTesting ? '镜像测速中...' : speedTesting ? '测速中...' : autoChannel === 'aria2' ? 'aria2 加速下载' : resumeState ? '继续下载' : probeResult.supportsRange ? '加速下载' : '直接下载'}
            </button>
          </div>
        )}

        {/* 下载进度 */}
        {downloading && autoChannel !== 'aria2' && (
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

      </main>
    </div>
  );
}
