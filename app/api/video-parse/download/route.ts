import { NextRequest, NextResponse } from 'next/server';

// GET /api/video-parse/download?url=<encoded-video-url>&filename=<suggested-name>
// 作为下载代理，用正确的请求头获取视频直链内容，转发给用户浏览器
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  const filename = request.nextUrl.searchParams.get('filename') || 'video.mp4';

  if (!url) {
    return NextResponse.json({ error: '请提供视频链接' }, { status: 400 });
  }

  // 基础校验：只允许已知的 CDN 域名
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: '无效的视频链接' }, { status: 400 });
  }

  const allowedHosts = [
    'tiktok.com',
    'tiktokcdn.com',
    'tiktokcdn-us.com',
    'iesdouyin.com',
    'douyinvod.com',
    'douyin.com',
    'bilibili.com',
    'bilivideo.com',
    'ixigua.com',
    'ixiguavideo.com',
  ];
  const isAllowed = allowedHosts.some((h) => parsedUrl.hostname.endsWith(h));
  if (!isAllowed) {
    return NextResponse.json({ error: '不支持的 CDN 域名' }, { status: 400 });
  }

  try {
    // 用浏览器 UA + 平台 Referer 请求视频
    const platformReferer = getPlatformReferer(parsedUrl.hostname);
    const resp = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: '*/*',
        Referer: platformReferer,
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(60000),
    });

    if (!resp.ok) {
      return NextResponse.json(
        { error: `CDN 返回 ${resp.status}` },
        { status: resp.status }
      );
    }

    const contentType = resp.headers.get('content-type') || 'video/mp4';
    const contentLength = resp.headers.get('content-length');

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Cache-Control': 'public, max-age=3600',
    };
    if (contentLength) {
      headers['Content-Length'] = contentLength;
    }

    return new NextResponse(resp.body, { status: 200, headers });
  } catch (err) {
    return NextResponse.json(
      { error: `下载失败: ${err instanceof Error ? err.message : '未知错误'}` },
      { status: 502 }
    );
  }
}

function getPlatformReferer(hostname: string): string {
  if (hostname.includes('tiktok')) return 'https://www.tiktok.com/';
  if (hostname.includes('douyin') || hostname.includes('iesdouyin')) return 'https://www.douyin.com/';
  if (hostname.includes('bilibili') || hostname.includes('bilivideo')) return 'https://www.bilibili.com/';
  if (hostname.includes('xigua') || hostname.includes('ixigua')) return 'https://www.ixigua.com/';
  return '';
}
