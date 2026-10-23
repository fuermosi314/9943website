import { NextResponse } from 'next/server';

// 每小时重新抓取一次最新版本，避免构建时被静态冻结
export const revalidate = 3600;

export async function GET() {
  try {
    const resp = await fetch('https://www.internetdownloadmanager.com/download.html', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      return NextResponse.json({ error: '获取下载页面失败' }, { status: 502 });
    }

    const html = await resp.text();

    // 提取 exe 下载链接
    const match = html.match(/https:\/\/download\.internetdownloadmanager\.com\/[^"']+\.exe/);
    if (!match) {
      return NextResponse.json({ error: '未找到下载链接' }, { status: 502 });
    }

    const url = match[0];
    // 从文件名提取版本号，如 idman643build16.exe → 6.43
    const versionMatch = url.match(/idman?(\d+)build(\d+)/i);
    const version = versionMatch
      ? `${versionMatch[1][0]}.${versionMatch[1].slice(1)}`
      : 'latest';

    return NextResponse.json({ url, version });
  } catch (err) {
    return NextResponse.json({ error: `请求失败: ${(err as Error).message}` }, { status: 500 });
  }
}
