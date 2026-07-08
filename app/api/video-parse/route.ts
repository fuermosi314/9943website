import { NextRequest, NextResponse } from 'next/server';

interface ParseResult {
  success: boolean;
  platform: string;
  type?: 'video' | 'images';
  title?: string;
  videoUrl?: string;
  imageUrls?: string[];
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

// ===== 抖音解析（多策略并行） =====
async function parseDouyin(url: string): Promise<ParseResult> {
  // 两个策略并行执行，谁先成功用谁
  const [strategy1, strategy2] = await Promise.allSettled([
    // 策略 1: 移动端 UA 跟随重定向 → 提取 aweme_id → 调详情 API
    (async (): Promise<ParseResult> => {
      const resp = await fetch(url, {
        headers: {
          ...HEADERS,
          'User-Agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(5000),
      });
      const finalUrl = resp.url || url;
      const idMatch =
        finalUrl.match(/\/video\/(\d+)/) ||
        finalUrl.match(/\/note\/(\d+)/) ||
        finalUrl.match(/aweme_id=(\d+)/) ||
        finalUrl.match(/\/(\d{15,})/);
      if (!idMatch) throw new Error('no aweme_id');
      return fetchDouyinDetail(idMatch[1]);
    })(),
    // 策略 2: 手动重定向提取 aweme_id → 分享页解析
    (async (): Promise<ParseResult> => {
      const resp = await fetch(url, {
        headers: HEADERS,
        redirect: 'manual',
        signal: AbortSignal.timeout(5000),
      });
      let finalUrl = url;
      if (resp.status >= 300 && resp.status < 400) {
        finalUrl = resp.headers.get('location') || url;
      }
      const idMatch =
        finalUrl.match(/\/video\/(\d+)/) ||
        finalUrl.match(/\/note\/(\d+)/) ||
        finalUrl.match(/aweme_id=(\d+)/);
      if (!idMatch) throw new Error('no aweme_id');
      const awemeId = idMatch[1];
      const shareUrl = `https://www.iesdouyin.com/share/note/${awemeId}/`;
      const pageResp = await fetch(shareUrl, {
        headers: {
          ...HEADERS,
          'User-Agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        },
        signal: AbortSignal.timeout(5000),
      });
      const html = await pageResp.text();
      const routerMatch = html.match(/window\._ROUTER_DATA\s*=\s*(\{[\s\S]*?\})\s*<\/script>/);
      if (!routerMatch) throw new Error('no router data');
      const routerData = JSON.parse(routerMatch[1]);
      const pageData = routerData?.loaderData?.['note_(id)/page'];
      const item = pageData?.videoInfoRes?.item_list?.[0];
      if (!item) throw new Error('no item');
      return extractDouyinItem(item);
    })(),
  ]);

  // 返回第一个成功的结果
  for (const r of [strategy1, strategy2]) {
    if (r.status === 'fulfilled' && r.value.success) return r.value;
  }
  // 如果有成功但没数据的，返回那个
  for (const r of [strategy1, strategy2]) {
    if (r.status === 'fulfilled') return r.value;
  }

  return {
    success: false,
    platform: 'douyin',
    error: '服务端解析失败，建议使用第三方工具',
    fallbackUrl: 'https://douyin.wtf/',
  };
}

// 通过 aweme_id 调用详情 API
async function fetchDouyinDetail(awemeId: string): Promise<ParseResult> {
  try {
    const apiUrl = `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${awemeId}`;
    const resp = await fetch(apiUrl, {
      headers: {
        ...HEADERS,
        Referer: 'https://www.douyin.com/',
      },
      signal: AbortSignal.timeout(5000),
    });
    const data = await resp.json();
    const item = data?.item_list?.[0];
    if (item) {
      return extractDouyinItem(item);
    }
  } catch {
    // API 调用失败
  }
  return { success: false, platform: 'douyin', error: 'API 解析失败' };
}

// 从抖音 item 中提取视频/图片信息
function extractDouyinItem(item: Record<string, unknown>): ParseResult {
  const desc = (item.desc as string) || '抖音作品';
  const author = (item.author as Record<string, unknown>)?.nickname as string;
  const awemeType = item.aweme_type as number;

  // type 2 = 图文作品
  if (awemeType === 2 && (item.images as unknown[])?.length > 0) {
    const imageUrls = (item.images as Array<{ url_list?: string[] }>)
      .map((img) => img.url_list?.[0])
      .filter((u): u is string => !!u);
    if (imageUrls.length > 0) {
      return {
        success: true,
        platform: 'douyin',
        type: 'images',
        title: desc,
        imageUrls,
        coverUrl: imageUrls[0],
        author,
      };
    }
  }

  // 视频作品
  const video = item.video as Record<string, unknown> | undefined;
  const playAddr = video?.play_addr as Record<string, unknown> | undefined;
  const bitRate = video?.bit_rate as Array<{ play_addr?: { url_list?: string[] } }> | undefined;
  const videoUrl =
    (playAddr?.url_list as string[] | undefined)?.[0] ||
    bitRate?.[0]?.play_addr?.url_list?.[0];

  if (videoUrl) {
    const cover = video?.cover as Record<string, unknown> | undefined;
    const coverUrl = (cover?.url_list as string[] | undefined)?.[0];
    return {
      success: true,
      platform: 'douyin',
      type: 'video',
      title: desc,
      videoUrl: videoUrl.replace('playwm', 'play'),
      coverUrl,
      author,
    };
  }

  return {
    success: false,
    platform: 'douyin',
    error: '无法获取下载地址',
    fallbackUrl: 'https://douyin.wtf/',
  };
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

// ===== 快手：返回第三方工具链接 =====
function parseKuaishou(_url: string): ParseResult {
  return {
    success: false,
    platform: 'kuaishou',
    error: '快手暂不支持服务端解析，请使用第三方工具',
    fallbackUrl: 'https://douyin.wtf/',
  };
}

// ===== TikTok 解析（多策略并行） =====
async function parseTiktok(url: string): Promise<ParseResult> {
  // 可能传入的是完整 URL，也可能只有视频 ID
  let videoId = extractTiktokVideoId(url);

  // 两个策略并行执行
  const [strategy1, strategy2] = await Promise.allSettled([
    // 策略 1: 主站页面 → __UNIVERSAL_DATA_FOR_REHYDRATION__ JSON
    (async (): Promise<ParseResult> => {
      let pageUrl = url;
      if (!videoId) {
        // 可能是短链，跟随重定向提取真实 URL
        const redirectResp = await fetch(url, {
          headers: {
            ...HEADERS,
            'Accept-Language': 'en-US,en;q=0.9',
          },
          redirect: 'follow',
          signal: AbortSignal.timeout(5000),
        });
        pageUrl = redirectResp.url || url;
        videoId = extractTiktokVideoId(pageUrl);
      }
      if (!videoId) throw new Error('no video_id');

      const resp = await fetch(`https://www.tiktok.com/@i/video/${videoId}`, {
        headers: {
          ...HEADERS,
          'Accept-Language': 'en-US,en;q=0.9',
          Cookie: '',  // 空 cookie，避免 TikTok 返回个性化内容
        },
        signal: AbortSignal.timeout(8000),
      });
      const html = await resp.text();
      return extractTiktokFromHtml(html, videoId);
    })(),
    // 策略 2: Embed 页面解析
    (async (): Promise<ParseResult> => {
      let vid = videoId;
      if (!vid) {
        const redirectResp = await fetch(url, {
          headers: {
            ...HEADERS,
            'Accept-Language': 'en-US,en;q=0.9',
          },
          redirect: 'follow',
          signal: AbortSignal.timeout(5000),
        });
        vid = extractTiktokVideoId(redirectResp.url || url);
      }
      if (!vid) throw new Error('no video_id from embed');

      const resp = await fetch(`https://www.tiktok.com/embed/v2/${vid}`, {
        headers: {
          ...HEADERS,
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(8000),
      });
      const html = await resp.text();
      return extractTiktokFromHtml(html, vid);
    })(),
  ]);

  // 返回第一个成功的结果
  for (const r of [strategy1, strategy2]) {
    if (r.status === 'fulfilled' && r.value.success) return r.value;
  }
  for (const r of [strategy1, strategy2]) {
    if (r.status === 'fulfilled') return r.value;
  }

  return {
    success: false,
    platform: 'tiktok',
    error: '服务端解析失败，建议使用第三方工具',
    fallbackUrl: 'https://snaptik.app/',
  };
}

// 从 TikTok URL 中提取视频 ID
function extractTiktokVideoId(url: string): string | null {
  // 主站: /video/123456
  const videoMatch = url.match(/\/video\/(\d+)/);
  if (videoMatch) return videoMatch[1];
  // 短链重定向后: tiktok.com/@user/video/123456
  const altMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  if (altMatch) return altMatch[1];
  return null;
}

// 从 TikTok 页面 HTML 中提取视频信息
function extractTiktokFromHtml(html: string, videoId: string): ParseResult {
  try {
    // 查找 __UNIVERSAL_DATA_FOR_REHYDRATION__ JSON
    const rehydrationIdx = html.indexOf('"__UNIVERSAL_DATA_FOR_REHYDRATION__"');
    if (rehydrationIdx < 0) {
      return {
        success: false,
        platform: 'tiktok',
        error: '页面数据解析失败（可能被反爬拦截）',
        fallbackUrl: 'https://snaptik.app/',
      };
    }

    // 定位 JSON 起始位置（<script> 标签内）
    const scriptStart = html.indexOf('>', rehydrationIdx);
    const jsonStart = html.indexOf('{', scriptStart);

    // 括号匹配找出完整 JSON
    let depth = 0;
    let jsonEnd = jsonStart;
    while (jsonEnd < html.length) {
      if (html[jsonEnd] === '{') depth++;
      else if (html[jsonEnd] === '}') {
        depth--;
        if (depth === 0) break;
      }
      jsonEnd++;
    }
    jsonEnd++; // include the closing }

    const data = JSON.parse(html.substring(jsonStart, jsonEnd));
    const scope = data?.__DEFAULT_SCOPE__;
    if (!scope) {
      return {
        success: false,
        platform: 'tiktok',
        error: '数据格式异常',
        fallbackUrl: 'https://snaptik.app/',
      };
    }

    // 路径: __DEFAULT_SCOPE__["webapp.video-detail"].itemInfo.itemStruct
    const videoDetail = scope['webapp.video-detail'];
    const itemStruct = videoDetail?.itemInfo?.itemStruct;
    if (!itemStruct) {
      return {
        success: false,
        platform: 'tiktok',
        error: '无法提取视频信息（视频可能已删除或私密）',
        fallbackUrl: 'https://snaptik.app/',
      };
    }

    const desc = itemStruct.desc || 'TikTok 作品';
    const author = itemStruct.author?.uniqueId || itemStruct.author?.nickname;
    const video = itemStruct.video;

    // 处理图文作品
    if (itemStruct.imagePost) {
      const images = itemStruct.imagePost.images;
      if (images?.length > 0) {
        const imageUrls = images.map(
          (img: { imageURL?: { urlList?: string[] } }) =>
            img.imageURL?.urlList?.[0]
        ).filter((u: string | undefined): u is string => !!u);
        if (imageUrls.length > 0) {
          return {
            success: true,
            platform: 'tiktok',
            type: 'images',
            title: desc,
            imageUrls,
            coverUrl: imageUrls[0],
            author,
          };
        }
      }
    }

    // 处理视频作品
    if (video) {
      // downloadAddr 通常是无水印的最高质量
      const videoUrl = video.downloadAddr || video.playAddr;
      const coverUrl = video.cover || video.originCover || video.dynamicCover;

      if (videoUrl) {
        return {
          success: true,
          platform: 'tiktok',
          type: 'video',
          title: desc,
          videoUrl,
          coverUrl,
          author,
        };
      }
    }

    return {
      success: false,
      platform: 'tiktok',
      error: '无法获取下载地址',
      fallbackUrl: 'https://snaptik.app/',
    };
  } catch {
    return {
      success: false,
      platform: 'tiktok',
      error: '页面解析失败',
      fallbackUrl: 'https://snaptik.app/',
    };
  }
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

  // 从分享文本中提取 URL（用户可能粘贴整段分享文字）
  const urlMatch = url.match(/https?:\/\/[^\s<>"')]+/);
  if (!urlMatch) {
    return NextResponse.json({ error: '未在输入中找到有效链接' }, { status: 400 });
  }

  // 基本 URL 校验
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlMatch[0]);
  } catch {
    return NextResponse.json({ error: '请输入有效的 URL 链接' }, { status: 400 });
  }

  const platform = detectPlatform(parsedUrl.href);
  if (!platform) {
    return NextResponse.json(
      {
        success: false,
        platform: 'unknown',
        error: '不支持的平台，目前支持：抖音、TikTok、B站、西瓜视频',
        supportedPlatforms: ['douyin', 'tiktok', 'bilibili', 'xigua', 'kuaishou'],
      },
      { status: 400 }
    );
  }

  const parser = PARSERS[platform];
  const result = await parser(parsedUrl.href);

  return NextResponse.json(result);
}
