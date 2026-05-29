import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const { url } = body;
  if (!url) {
    return NextResponse.json({ error: '请提供下载链接' }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: '请输入有效的 URL 链接' }, { status: 400 });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: '仅支持 HTTP/HTTPS 链接' }, { status: 400 });
  }

  try {
    // 用 HEAD 请求探测文件信息
    const headResp = await fetch(parsedUrl.href, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });

    if (!headResp.ok && headResp.status !== 206) {
      // HEAD 可能不被支持，尝试 GET
      const getResp = await fetch(parsedUrl.href, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Range: 'bytes=0-0',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
      });

      const contentLength = getResp.headers.get('content-length');
      const acceptRanges = getResp.headers.get('accept-ranges');
      const contentType = getResp.headers.get('content-type') || '';

      // 检测 CORS 支持
      const acao = getResp.headers.get('access-control-allow-origin');
      const supportsCors = acao === '*' || acao === 'null';

      // 从 URL 提取文件名
      const pathParts = parsedUrl.pathname.split('/');
      const lastPart = pathParts[pathParts.length - 1] || 'download';
      const fileName = decodeURIComponent(lastPart).replace(/[^a-zA-Z0-9._\-一-鿿]/g, '_') || 'download';

      return NextResponse.json({
        fileName,
        fileSize: contentLength ? parseInt(contentLength) : 0,
        supportsRange: acceptRanges === 'bytes' || getResp.status === 206,
        supportsCors,
        contentType: contentType.split(';')[0],
      });
    }

    const contentLength = headResp.headers.get('content-length');
    const acceptRanges = headResp.headers.get('accept-ranges');
    const contentType = headResp.headers.get('content-type') || '';

    // 检测 CORS 支持
    const acao = headResp.headers.get('access-control-allow-origin');
    const supportsCors = acao === '*' || acao === 'null';

    // 从 Content-Disposition 或 URL 提取文件名
    let fileName = '';
    const disposition = headResp.headers.get('content-disposition');
    if (disposition) {
      const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
      if (match) fileName = decodeURIComponent(match[1].replace(/"/g, ''));
    }
    if (!fileName) {
      const pathParts = parsedUrl.pathname.split('/');
      const lastPart = pathParts[pathParts.length - 1] || 'download';
      fileName = decodeURIComponent(lastPart).replace(/[^a-zA-Z0-9._\-一-鿿]/g, '_') || 'download';
    }

    const fileSize = contentLength ? parseInt(contentLength) : 0;
    const supportsRange = acceptRanges === 'bytes' || headResp.status === 206;

    return NextResponse.json({
      fileName,
      fileSize,
      supportsRange: supportsRange && fileSize > 0,
      supportsCors,
      contentType: contentType.split(';')[0],
    });
  } catch (err) {
    return NextResponse.json({
      error: `无法访问该链接: ${(err as Error).message}`,
    });
  }
}
