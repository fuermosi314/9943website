import { NextResponse } from 'next/server';

export const revalidate = 3600;

export async function GET() {
  try {
    const resp = await fetch('https://www.voidtools.com/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      return NextResponse.json({ error: '获取版本信息失败' }, { status: 502 });
    }

    const html = await resp.text();
    // 固定取 1.4.x 稳定版，避开 1.5 beta
    const match = html.match(/Everything-(1\.4\.\d+\.\d+)\.x64-Setup\.exe/);
    if (!match) {
      return NextResponse.json({ error: '未找到稳定版版本号' }, { status: 502 });
    }

    return NextResponse.json({ version: match[1] });
  } catch (err) {
    return NextResponse.json({ error: `请求失败: ${(err as Error).message}` }, { status: 500 });
  }
}
