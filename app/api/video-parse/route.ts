import { NextRequest, NextResponse } from 'next/server';

interface ParseResult {
  success: boolean;
  platform: string;
  title?: string;
  videoUrl?: string;
  coverUrl?: string;
  author?: string;
  error?: string;
  fallbackUrl?: string;
}

// 简易 IP 速率限制（每 IP 每分钟最多 10 次）
const rateLimit = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimit.get(ip);
  if (!record || now > record.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + 60_000 });
    return true;
  }
  if (record.count >= 10) return false;
  record.count++;
  return true;
}

function detectPlatform(url: string): string | null {
  if (/douyin\.com|iesdouyin\.com/.test(url)) return 'douyin';
  if (/bilibili\.com|b23\.tv/.test(url)) return 'bilibili';
  if (/ixigua\.com/.test(url)) return 'xigua';
  if (/kuaishou\.com|v\.kuaishou\.com/.test(url)) return 'kuaishou';
  if (/tiktok\.com/.test(url)) return 'tiktok';
  return null;
}

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

// ===== 抖音解析 =====
async function parseDouyin(url: string): Promise<ParseResult> {
  try {
    // 1. 跟随短链重定向，获取完整 URL
    const resp = await fetch(url, {
      headers: {
        ...HEADERS,
        Accept: 'text/html',
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
    });

    let finalUrl = url;
    if (resp.status >= 300 && resp.status < 400) {
      finalUrl = resp.headers.get('location') || url;
    }

    // 从 URL 中提取 aweme_id
    const idMatch = finalUrl.match(/\/video\/(\d+)/) || finalUrl.match(/aweme_id=(\d+)/);
    if (!idMatch) {
      return {
        success: false,
        platform: 'douyin',
        error: '无法从链接中提取视频 ID',
        fallbackUrl: 'https://www.douyin.com',
      };
    }

    const awemeId = idMatch[1];

    // 2. 调用抖音详情 API
    const detailUrl = `https://www.douyin.com/aweme/v1/web/aweme/detail/?aweme_id=${awemeId}&aid=6383&cookie_enabled=true`;
    const detailResp = await fetch(detailUrl, {
      headers: {
        ...HEADERS,
        Referer: 'https://www.douyin.com/',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!detailResp.ok) {
      return {
        success: false,
        platform: 'douyin',
        error: `抖音 API 返回 ${detailResp.status}`,
        fallbackUrl: 'https://www.douyin.com',
      };
    }

    const data = await detailResp.json();
    const aweme = data.aweme_detail;
    if (!aweme) {
      return {
        success: false,
        platform: 'douyin',
        error: '未找到视频信息',
        fallbackUrl: 'https://www.douyin.com',
      };
    }

    // 获取无水印视频 URL
    const videoUrl =
      aweme.video?.play_addr?.url_list?.[0] ||
      aweme.video?.bit_rate?.[0]?.play_addr?.url_list?.[0];

    if (!videoUrl) {
      return {
        success: false,
        platform: 'douyin',
        error: '无法获取视频下载地址',
        fallbackUrl: 'https://www.douyin.com',
      };
    }

    return {
      success: true,
      platform: 'douyin',
      title: aweme.desc || '抖音视频',
      videoUrl: videoUrl.replace('playwm', 'play'),
      coverUrl: aweme.video?.cover?.url_list?.[0],
      author: aweme.author?.nickname,
    };
  } catch (err) {
    return {
      success: false,
      platform: 'douyin',
      error: `解析失败: ${err instanceof Error ? err.message : '未知错误'}`,
      fallbackUrl: 'https://www.douyin.com',
    };
  }
}

// ===== Bilibili 解析 =====
async function parseBilibili(url: string): Promise<ParseResult> {
  try {
    // 1. 提取 BV ID
    let bvId = '';
    const bvMatch = url.match(/BV[a-zA-Z0-9]+/);
    if (bvMatch) {
      bvId = bvMatch[0];
    } else {
      // 可能是短链 b23.tv，先跟随重定向
      const resp = await fetch(url, {
        headers: HEADERS,
        redirect: 'manual',
        signal: AbortSignal.timeout(10000),
      });
      const redirectUrl = resp.headers.get('location') || '';
      const redirectBv = redirectUrl.match(/BV[a-zA-Z0-9]+/);
      if (redirectBv) {
        bvId = redirectBv[0];
      }
    }

    if (!bvId) {
      return {
        success: false,
        platform: 'bilibili',
        error: '无法从链接中提取视频 BV 号',
        fallbackUrl: 'https://www.bilibili.com',
      };
    }

    // 2. 获取视频信息
    const infoResp = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvId}`, {
      headers: {
        ...HEADERS,
        Referer: 'https://www.bilibili.com/',
      },
      signal: AbortSignal.timeout(10000),
    });

    const infoData = await infoResp.json();
    if (infoData.code !== 0 || !infoData.data) {
      return {
        success: false,
        platform: 'bilibili',
        error: infoData.message || '获取视频信息失败',
        fallbackUrl: 'https://www.bilibili.com',
      };
    }

    const { title, owner, cid } = infoData.data;
    const pic = infoData.data.pic;

    // 3. 获取视频播放地址
    const playResp = await fetch(
      `https://api.bilibili.com/x/player/playurl?bvid=${bvId}&cid=${cid}&qn=80&fnval=16`,
      {
        headers: {
          ...HEADERS,
          Referer: `https://www.bilibili.com/video/${bvId}`,
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    const playData = await playResp.json();
    if (playData.code !== 0) {
      return {
        success: false,
        platform: 'bilibili',
        error: '获取播放地址失败',
        fallbackUrl: 'https://www.bilibili.com',
      };
    }

    // DASH 格式：合并音频和视频
    const dash = playData.data?.dash;
    if (dash) {
      const videoStream = dash.video?.[0];
      const audioStream = dash.audio?.[0];
      if (videoStream?.baseUrl) {
        return {
          success: true,
          platform: 'bilibili',
          title: title || 'B站视频',
          videoUrl: videoStream.baseUrl,
          coverUrl: pic,
          author: owner?.name,
        };
      }
    }

    // 普通格式
    const playUrl = playData.data?.durl?.[0]?.url;
    if (playUrl) {
      return {
        success: true,
        platform: 'bilibili',
        title: title || 'B站视频',
        videoUrl: playUrl,
        coverUrl: pic,
        author: owner?.name,
      };
    }

    return {
      success: false,
      platform: 'bilibili',
      error: '无法获取视频播放地址（可能需要登录查看高清版本）',
      fallbackUrl: 'https://www.bilibili.com',
    };
  } catch (err) {
    return {
      success: false,
      platform: 'bilibili',
      error: `解析失败: ${err instanceof Error ? err.message : '未知错误'}`,
      fallbackUrl: 'https://www.bilibili.com',
    };
  }
}

// ===== 西瓜视频解析 =====
async function parseXigua(url: string): Promise<ParseResult> {
  try {
    // 西瓜视频的解析逻辑与抖音类似（同属字节跳动）
    const resp = await fetch(url, {
      headers: HEADERS,
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
    });

    let finalUrl = url;
    if (resp.status >= 300 && resp.status < 400) {
      finalUrl = resp.headers.get('location') || url;
    }

    // 尝试提取视频 ID
    const idMatch = finalUrl.match(/\/video\/(\d+)/);
    if (!idMatch) {
      return {
        success: false,
        platform: 'xigua',
        error: '无法解析西瓜视频链接',
        fallbackUrl: 'https://www.ixigua.com',
      };
    }

    const videoId = idMatch[1];

    // 尝试获取页面内容提取视频 URL
    const pageResp = await fetch(`https://www.ixigua.com/${videoId}`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(10000),
    });

    const html = await pageResp.text();
    const videoMatch = html.match(/"playUrl"\s*:\s*"([^"]+)"/);
    const titleMatch = html.match(/"title"\s*:\s*"([^"]+)"/);

    if (videoMatch) {
      return {
        success: true,
        platform: 'xigua',
        title: titleMatch?.[1] || '西瓜视频',
        videoUrl: videoMatch[1].replace(/\\u002F/g, '/'),
        fallbackUrl: 'https://www.ixigua.com',
      };
    }

    return {
      success: false,
      platform: 'xigua',
      error: '无法获取西瓜视频下载地址',
      fallbackUrl: 'https://www.ixigua.com',
    };
  } catch (err) {
    return {
      success: false,
      platform: 'xigua',
      error: `解析失败: ${err instanceof Error ? err.message : '未知错误'}`,
      fallbackUrl: 'https://www.ixigua.com',
    };
  }
}

// ===== 快手：直接返回 fallback =====
function parseKuaishou(url: string): ParseResult {
  return {
    success: false,
    platform: 'kuaishou',
    error: '快手暂不支持服务端解析，请使用第三方工具',
    fallbackUrl: 'https://www.kuaishou.com',
  };
}

// ===== TikTok：直接返回 fallback =====
function parseTiktok(url: string): ParseResult {
  return {
    success: false,
    platform: 'tiktok',
    error: 'TikTok 暂不支持服务端解析，请使用第三方工具',
    fallbackUrl: 'https://www.tiktok.com',
  };
}

const PARSERS: Record<string, (url: string) => Promise<ParseResult> | ParseResult> = {
  douyin: parseDouyin,
  bilibili: parseBilibili,
  xigua: parseXigua,
  kuaishou: parseKuaishou,
  tiktok: parseTiktok,
};

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 });
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const { url } = body;
  if (!url) {
    return NextResponse.json({ error: '请提供视频链接' }, { status: 400 });
  }

  // 基本 URL 校验
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: '请输入有效的 URL 链接' }, { status: 400 });
  }

  const platform = detectPlatform(parsedUrl.href);
  if (!platform) {
    return NextResponse.json(
      {
        success: false,
        platform: 'unknown',
        error: '不支持的平台，目前支持：抖音、B站、西瓜视频',
        supportedPlatforms: ['douyin', 'bilibili', 'xigua', 'kuaishou', 'tiktok'],
      },
      { status: 400 }
    );
  }

  const parser = PARSERS[platform];
  const result = await parser(parsedUrl.href);

  return NextResponse.json(result);
}
