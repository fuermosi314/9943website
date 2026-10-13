// 抖音解析：无头 Chromium + 登录态 cookie
//
// 为什么必须用浏览器，而不是纯 HTTP：
//   `/aweme/v1/web/aweme/detail/` 受 secsdk 风控保护，需要 `x-secsdk-web-signature`
//   签名。该签名的实现在 `secsdk_runtime.js` 里注册（window.use("webSignUrl")），
//   没有可移植的公开实现。实测：
//     - 纯 HTTP 带 a_bogus + 完整测试 cookie → 403 "Uifid Not Found"
//     - 真浏览器（自己跑 secsdk）           → 200，正常返回数据
//   所以让浏览器自己算签名，我们只负责把结果取出来。
//
// 登录的必要性：
//   未登录时抖音对 detail 接口静默返回 **空 body**（HTTP 200 / 0 字节），
//   与 IP 无关（中国大陆 IP 与美国数据中心 IP 实测表现一致）。
//   详见 PROJECT.md §7.4。

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const DETAIL_PATH = '/aweme/v1/web/aweme/detail/';
// 等待 detail 响应的上限。
// 实测：热实例约 10~14s；**冷启动首次调用**要把 chromium.br 解压到 /tmp（约 50MB），
// 会明显更慢，实测出现过 25s 仍超时的情况，所以留到 40s。
const DETAIL_TIMEOUT_MS = 40_000;

// 缓存：aweme_id → 无水印直链所需的 uri。
// 不过期 —— 因为 aweme/v1/play 生成的直链是永久的（不带 token），
// 一个视频只需解析一次。热门视频命中后对抖音零请求，账号风险与访问量脱钩。
const CACHE_PREFIX = 'douyin:uri:';

// ===== 并发闸门 =====
//
// Vercel Hobby 每个实例只有 2GB 内存，而一个 Chromium 要占 200~400MB。
// Fluid Compute 会把并发请求塞进同一个实例，多个请求同时命中缓存未命中路径时
// 会同时开多个浏览器 → 内存爆掉，整个实例的请求一起失败。
//
// 这里限制**单实例同时最多开 2 个浏览器**，多的排队。代价是排队请求变慢，
// 但把"大家一起崩"换成"慢一点但都能出结果"。
//
// 注意：闸门是进程内的，只约束单个实例；Vercel 自动扩容出的新实例各自计数。
// 这已经足够 —— 因为压力被分摊到新实例上，反而降低了单实例爆内存的概率。
const MAX_CONCURRENT_BROWSERS = 2;
// 排队等待上限。超过就放弃并返回失败，避免请求堆到函数超时（白等 120s）
const QUEUE_TIMEOUT_MS = 30_000;

let activeBrowsers = 0;
const waiting: Array<() => void> = [];

async function acquireBrowserSlot(): Promise<boolean> {
  if (activeBrowsers < MAX_CONCURRENT_BROWSERS) {
    activeBrowsers++;
    return true;
  }
  // 排队；超时则放弃。被 releaseBrowserSlot 唤醒时名额直接转交，无需再加
  const acquired = await new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      const i = waiting.indexOf(handoff);
      if (i >= 0) waiting.splice(i, 1);
      resolve(false);
    }, QUEUE_TIMEOUT_MS);
    const handoff = () => {
      clearTimeout(timer);
      resolve(true);
    };
    waiting.push(handoff);
  });
  return acquired;
}

function releaseBrowserSlot(): void {
  const next = waiting.shift();
  if (next) next(); // 名额直接转交给排队者，activeBrowsers 不变
  else activeBrowsers--;
}

export interface DouyinDetail {
  type?: 'video' | 'images';
  uri?: string;
  images?: string[];
  desc?: string;
  author?: string;
  cover?: string;
}

// ===== Upstash REST（沿用 app/api/chat/route.ts 的原生 fetch 风格，不引依赖）=====
const REDIS_TIMEOUT_MS = 3000;

function redisEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

async function redisCmd(commands: string[][]): Promise<{ result?: unknown }[] | null> {
  const env = redisEnv();
  if (!env) return null;
  try {
    const res = await fetch(`${env.url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(REDIS_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as { result?: unknown }[];
  } catch (err) {
    // fail-open：缓存挂了就退回直接解析，不影响主流程
    console.error('[douyin] 缓存不可用', err instanceof Error ? err.message : err);
    return null;
  }
}

async function getCached(awemeId: string): Promise<DouyinDetail | null> {
  const r = await redisCmd([['GET', CACHE_PREFIX + awemeId]]);
  const raw = r?.[0]?.result;
  if (typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw) as DouyinDetail;
  } catch {
    return null;
  }
}

async function setCached(awemeId: string, detail: DouyinDetail): Promise<void> {
  await redisCmd([['SET', CACHE_PREFIX + awemeId, JSON.stringify(detail)]]);
}

// 把 Cookie 头拆成 puppeteer 需要的 cookie 对象。
// 两个域都灌：douyin.com 的接口调用与 www.douyin.com 的页面 JS 都要用到。
function parseCookies(header: string) {
  const out: Array<{ name: string; value: string; domain: string; path: string }> = [];
  for (const part of header.split(';')) {
    const p = part.trim();
    const i = p.indexOf('=');
    if (i <= 0) continue;
    const name = p.slice(0, i).trim();
    const value = p.slice(i + 1);
    out.push({ name, value, domain: '.douyin.com', path: '/' });
    out.push({ name, value, domain: 'www.douyin.com', path: '/' });
  }
  return out;
}

// 从 aweme_detail 里提取我们需要的字段
function pickDetail(item: Record<string, unknown>): DouyinDetail {
  const author = (item.author as Record<string, unknown>) || {};
  const base = {
    desc: (item.desc as string) || undefined,
    author: (author.nickname as string) || undefined,
  };

  // 图文作品（aweme_type 2）：没有 uri，交给前端下载图片
  const images = (item.images as Array<{ url_list?: string[] }>) || [];
  if (images.length > 0) {
    const urls = images.map((img) => img.url_list?.[0]).filter((u): u is string => !!u);
    if (urls.length > 0) return { ...base, type: 'images', images: urls, cover: urls[0] };
  }

  const video = (item.video as Record<string, unknown>) || {};
  const playAddr = (video.play_addr as Record<string, unknown>) || {};
  const cover = (video.cover as Record<string, unknown>) || {};
  return {
    ...base,
    type: 'video',
    uri: (playAddr.uri as string) || undefined,
    cover: ((cover.url_list as string[]) || [])[0],
  };
}

// 打开一个无头浏览器，让页面自己完成签名并请求 detail，把结果取出来
async function fetchDetailInBrowser(awemeId: string): Promise<Record<string, unknown> | null> {
  const cookieHeader = process.env.DY_COOKIES;
  if (!cookieHeader) {
    console.error('[douyin] 未配置 DY_COOKIES，无法解析');
    return null;
  }

  // 这两个包是 ESM-only，必须动态 import
  const chromiumMod = await import('@sparticuz/chromium');
  const chromium = (chromiumMod as { default?: unknown }).default ?? chromiumMod;
  const puppeteer = await import('puppeteer-core');

  const browser = await puppeteer.launch({
    args: [...(chromium as { args: string[] }).args],
    defaultViewport: { width: 1600, height: 900 },
    executablePath: await (chromium as { executablePath: () => Promise<string> }).executablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(UA);
    const cookieList = parseCookies(cookieHeader);
    await page.setCookie(...cookieList);

    // 诊断用：记录 detail 接口被调用了几次、返回多大
    const seen: { status: number; size: number }[] = [];

    // 事件驱动等待：detail 响应一到就结束，不做固定 sleep
    let timedOut = false;
    const detailPromise = new Promise<Record<string, unknown> | null>((resolve) => {
      const timer = setTimeout(() => {
        timedOut = true;
        resolve(null);
      }, DETAIL_TIMEOUT_MS);
      page.on('response', async (r) => {
        if (!r.url().includes(DETAIL_PATH)) return;
        try {
          const body = await r.text();
          seen.push({ status: r.status(), size: body.length });
          // 未登录时返回 200 空 body，据此判定失败
          if (body.length < 1000) return;
          const parsed = JSON.parse(body) as { aweme_detail?: Record<string, unknown> };
          if (parsed.aweme_detail) {
            clearTimeout(timer);
            resolve(parsed.aweme_detail);
          }
        } catch {
          // 忽略单次解析失败，继续等其他响应
        }
      });
    });

    await page.goto(`https://www.douyin.com/video/${awemeId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    const result = await detailPromise;

    if (!result) {
      // 失败的诊断信息：不打印 cookie 内容本身
      console.error(
        '[douyin] 未取到 detail',
        JSON.stringify({
          awemeId,
          cookieLen: cookieHeader.length,
          cookieCount: cookieList.length,
          detailCalls: seen,
          timedOut,
          url: page.url().slice(0, 80),
        }),
      );
    }
    return result;
  } finally {
    await browser.close().catch(() => {});
  }
}

/**
 * 解析抖音视频，返回无水印直链所需的信息。
 *
 * 先查缓存（aweme_id → uri），未命中才开浏览器。
 */
export async function resolveDouyin(awemeId: string): Promise<DouyinDetail | null> {
  const cached = await getCached(awemeId);
  if (cached?.uri) return cached;

  // 走浏览器前先抢名额，避免并发把实例内存打爆
  const gotSlot = await acquireBrowserSlot();
  if (!gotSlot) {
    console.error('[douyin] 等待浏览器名额超时，放弃本次解析', awemeId);
    return null;
  }

  let item: Record<string, unknown> | null = null;
  try {
    item = await fetchDetailInBrowser(awemeId);
  } finally {
    releaseBrowserSlot();
  }
  if (!item) return null;

  const detail = pickDetail(item);
  // 有 uri 才缓存：图文作品没有 uri，且图片地址会过期，不适合长期缓存
  if (detail.uri) await setCached(awemeId, detail);
  return detail;
}
