import { NextResponse } from 'next/server';

// 解析 GitHub 302 重定向，获取真实 CDN 地址
async function resolveRedirect(url: string): Promise<string> {
  try {
    const resp = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
    });
    const location = resp.headers.get('location');
    if (location) return location;
  } catch { /* ignore */ }
  return url;
}

export async function GET() {
  try {
    const resp = await fetch('https://api.github.com/repos/aria2/aria2/releases/latest', {
      headers: { 'Accept': 'application/vnd.github.v3+json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      return NextResponse.json({ error: '获取版本信息失败' }, { status: 502 });
    }

    const data = await resp.json();
    const assets = data.assets || [];

    // 找 Windows 64-bit zip
    const win64 = assets.find((a: { name: string }) =>
      a.name.includes('win-64bit') && a.name.endsWith('.zip')
    );
    // 找 Windows 32-bit zip
    const win32 = assets.find((a: { name: string }) =>
      a.name.includes('win-32bit') && a.name.endsWith('.zip')
    );

    // 并发解析真实下载地址
    const [win64Url, win32Url] = await Promise.all([
      win64 ? resolveRedirect(win64.browser_download_url) : Promise.resolve(null),
      win32 ? resolveRedirect(win32.browser_download_url) : Promise.resolve(null),
    ]);

    return NextResponse.json({
      version: data.tag_name || data.name,
      win64: win64 ? { url: win64Url, name: win64.name, size: win64.size } : null,
      win32: win32 ? { url: win32Url, name: win32.name, size: win32.size } : null,
      allUrl: data.html_url,
    });
  } catch (err) {
    return NextResponse.json({ error: `请求失败: ${(err as Error).message}` }, { status: 500 });
  }
}
