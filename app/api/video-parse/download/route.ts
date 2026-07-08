import { NextRequest, NextResponse } from 'next/server';

// GET /api/video-parse/download?url=<encoded-video-url>&filename=<suggested-name>
// 下载代理：用正确的请求头获取视频直链，流式转发给用户
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  const filenameBase = request.nextUrl.searchParams.get('filename') || 'video.mp4';

  if (!url) {
    return NextResponse.json({ error: '请提供视频链接' }, { status: 400 });
  }

  // 基础校验
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: '无效的视频链接' }, { status: 400 });
  }

  const allowedHosts = [
    'tiktok.com', 'tiktokcdn.com', 'tiktokcdn-us.com',
    'iesdouyin.com', 'douyinvod.com', 'douyin.com',
    'bilibili.com', 'bilivideo.com',
    'ixigua.com', 'ixiguavideo.com',
    'snssdk.com', 'bytecdn.cn', 'byteimg.com', 'byteoversea.com',
  ];
  const isAllowed = allowedHosts.some((h) => parsedUrl.hostname.endsWith(h));
  if (!isAllowed) {
    return NextResponse.json({ error: '不支持的 CDN 域名' }, { status: 400 });
  }

  const platformReferer = getPlatformReferer(parsedUrl.hostname);

  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: '*/*',
        Referer: platformReferer,
        Origin: platformReferer,
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'video',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
        'Range': request.headers.get('range') || 'bytes=0-',
      },
      signal: AbortSignal.timeout(60000),
      redirect: 'follow',
    });

    if (!resp.ok && resp.status !== 206) {
      return NextResponse.json(
        { error: `CDN 返回 ${resp.status}` },
        { status: resp.status }
      );
    }

    const contentType = resp.headers.get('content-type') || 'video/mp4';
    const contentLength = resp.headers.get('content-length');
    const contentRange = resp.headers.get('content-range');
    const disposition = `attachment; filename*=UTF-8''${encodeURIComponent(filenameBase)}`;

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Disposition': disposition,
      'Cache-Control': 'public, max-age=3600',
      'Accept-Ranges': 'bytes',
    };
    if (contentLength) headers['Content-Length'] = contentLength;
    if (contentRange) headers['Content-Range'] = contentRange;

    const status = resp.status === 206 ? 206 : 200;
    return new NextResponse(resp.body, { status, headers });
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
