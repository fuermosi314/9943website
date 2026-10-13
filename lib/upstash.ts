// Upstash Redis 的极简封装（原生 fetch 打 REST pipeline，不引 npm 依赖）
//
// 为什么要有这个文件：这个模式在项目里原本已经出现过两次
// （app/api/chat/route.ts 的共享限流、lib/douyin-browser.ts 的解析缓存），
// 再抄第三遍就该抽出来了。
//
// 统一原则是 **fail-open**：Redis 不可用时返回 null，调用方自行降级，
// 绝不让缓存/限流这类辅助设施把主流程拖挂。

const REDIS_TIMEOUT_MS = 3000;

export function redisEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

/**
 * 执行一批 Redis 命令。失败（含未配置）时返回 null，调用方需自行降级。
 */
export async function redisPipeline(
  commands: unknown[][],
): Promise<{ result?: unknown }[] | null> {
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
    console.error('[upstash] 不可用', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * 跨实例共享的分钟级计数器限流。
 *
 * 取代各 route 里自建的进程内 Map —— 那种实现在 Serverless 下形同虚设：
 * 每个实例各记一份，冷启动即清零，扩容后更是完全没有上限。
 *
 * @returns true = 放行；false = 超限；null = Redis 不可用（调用方按 fail-open 处理）
 */
export async function checkSharedRateLimit(
  key: string,
  limit: number,
  windowSec = 60,
): Promise<boolean | null> {
  const bucket = Math.floor(Date.now() / (windowSec * 1000));
  const redisKey = `rl:${key}:${bucket}`;
  const r = await redisPipeline([
    ['INCR', redisKey],
    ['EXPIRE', redisKey, String(windowSec * 2)],
  ]);
  if (!r) return null;
  const count = Number(r[0]?.result);
  if (!Number.isFinite(count)) return null;
  return count <= limit;
}
