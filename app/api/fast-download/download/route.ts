import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  let body: { url?: string; start?: number; end?: number };
  try {
    body = await request.json();
  } catch {
    return new Response('请求格式错误', { status: 400 });
  }

  const { url, start, end } = body;
  if (!url || start === undefined || end === undefined) {
    return new Response('缺少参数', { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return new Response('无效 URL', { status: 400 });
  }

  try {
    const resp = await fetch(parsedUrl.href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Range: `bytes=${start}-${end}`,
      },
      signal: AbortSignal.timeout(300_000), // 5 分钟超时
    });

    if (!resp.ok && resp.status !== 206) {
      return new Response(`上游返回 ${resp.status}`, { status: 502 });
    }

    // 流式转发响应
    return new Response(resp.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    return new Response(`下载失败: ${(err as Error).message}`, { status: 502 });
  }
}
