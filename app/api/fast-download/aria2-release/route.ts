import { NextResponse } from 'next/server';

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
    // 找 macOS
    const mac = assets.find((a: { name: string }) =>
      a.name.includes('osx') || a.name.includes('macos') || a.name.includes('darwin')
    );

    return NextResponse.json({
      version: data.tag_name || data.name,
      win64: win64 ? { url: win64.browser_download_url, name: win64.name, size: win64.size } : null,
      win32: win32 ? { url: win32.browser_download_url, name: win32.name, size: win32.size } : null,
      mac: mac ? { url: mac.browser_download_url, name: mac.name, size: mac.size } : null,
      allUrl: data.html_url,
    });
  } catch (err) {
    return NextResponse.json({ error: `请求失败: ${(err as Error).message}` }, { status: 500 });
  }
}
