import { NextRequest, NextResponse } from 'next/server';

interface GenerateRequest {
  topic: string;
  platform: string;
  contentType: string;
}

interface Hook {
  text: string;
  style: string;
  score: number;
  reason: string;
}

interface GenerateResponse {
  hooks: Hook[];
}

const PLATFORM_GUIDE: Record<string, string> = {
  xiaohongshu: '小红书风格：种草感、闺蜜语气、适当使用emoji、常用"姐妹们""救命""绝绝子"等网络用语，标题要有吸引力，适合年轻女性用户。',
  douyin: '抖音风格：前3秒必须抓住注意力、善用反转和悬念、常用"你知道吗""千万别""我后悔了"等开头，口语化、节奏快。',
  bilibili: 'B站风格：可以玩梗、有知识感、常用"家人们""今天来聊个有意思的事"，用户喜欢有深度但不装的内容。',
  youtube: 'YouTube风格：英文思维的中文表达、善用好奇心缺口（curiosity gap）、常用"如果…会怎样""真相是…"等结构。',
  x: 'X/Twitter风格：简短锐利、观点鲜明、适合thread开头、常用"Hot take:""说个扎心的事实""不接受反驳"等表达。',
};

const CONTENT_GUIDE: Record<string, string> = {
  video: '视频内容：hook要口语化、节奏快、有悬念或冲突，让人想继续看下去。适合用疑问句或反转句。',
  'image-text': '图文内容：hook要像标题党、有列表感、善用emoji排版，让人想点进来看全文。',
  ad: '产品广告：从痛点切入、场景代入、常用"你是不是也…""终于找到了"等表达，让人产生共鸣。',
  tutorial: '教程类：承诺具体结果、用数字量化、常用"X分钟学会""一招搞定""保姆级教程"等表达。',
  opinion: '观点帖：开头要有争议性、反常识或鲜明立场、常用"说实话""我知道说了会被骂""不接受反驳"等表达。',
};

const STYLE_TYPES = [
  '悬念型',
  '痛点型',
  '数字型',
  '反常识型',
  '故事型',
  '提问型',
  '紧迫型',
  '权威型',
  '共情型',
  '争议型',
];

function buildPrompt(topic: string, platform: string, contentType: string): string {
  const platformGuide = PLATFORM_GUIDE[platform] || PLATFORM_GUIDE.xiaohongshu;
  const contentGuide = CONTENT_GUIDE[contentType] || CONTENT_GUIDE.video;

  return `你是一个顶级的社交媒体内容策划专家，擅长撰写爆款开头（hook）。

现在需要你为以下主题生成10个不同风格的爆款开头hook：

主题：${topic}
平台：${platformGuide}
内容类型：${contentGuide}

要求：
1. 每个hook必须风格不同，覆盖以下10种风格：${STYLE_TYPES.join('、')}
2. 每个hook控制在30字以内
3. 要有真实感，不要假大空
4. 紧扣主题，不要偏离
5. 符合所选平台的说话风格和用户习惯

请严格按以下JSON格式输出，不要输出其他内容：
{
  "hooks": [
    {
      "text": "hook文案内容",
      "style": "风格类型",
      "score": 8,
      "reason": "推荐理由，说明为什么这个hook有效"
    }
  ]
}

评分标准（1-10分）：
- 好奇心激发程度（30%）
- 情绪触发强度（25%）
- 平台风格匹配度（25%）
- 信息密度（20%）

请生成10个hook，风格依次为：${STYLE_TYPES.join('、')}`;
}

// 简易 IP 速率限制（每 IP 每分钟最多 5 次）
const rateLimit = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimit.get(ip);
  if (!record || now > record.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + 60_000 });
    return true;
  }
  if (record.count >= 5) return false;
  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: '请在项目根目录 .env.local 中配置 DEEPSEEK_API_KEY' },
      { status: 500 }
    );
  }

  let body: GenerateRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const { topic, platform, contentType } = body;
  if (!topic || !platform || !contentType) {
    return NextResponse.json({ error: '请填写完整信息：主题、平台、内容类型' }, { status: 400 });
  }

  if (topic.length > 100) {
    return NextResponse.json({ error: '主题内容不能超过100个字' }, { status: 400 });
  }

  const rawBase = process.env.DEEPSEEK_BASE_URL;
  const baseURL =
    rawBase && /^https?:\/\//i.test(rawBase) ? rawBase : 'https://api.deepseek.com';
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  const prompt = buildPrompt(topic, platform, contentType);

  try {
    const res = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
      const errBody = await res.text();
      if (res.status === 401) {
        return NextResponse.json({ error: 'API Key 无效，请检查 .env.local 配置' }, { status: 401 });
      }
      return NextResponse.json({ error: `AI 服务调用失败（${res.status}）: ${errBody.slice(0, 200)}` }, { status: 502 });
    }

    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content || '';

    // 提取 JSON（兼容 markdown 代码块包裹的情况）
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI 返回格式异常，请重试' }, { status: 502 });
    }

    const parsed = JSON.parse(jsonMatch[0]) as GenerateResponse;
    if (!parsed.hooks || !Array.isArray(parsed.hooks) || parsed.hooks.length === 0) {
      return NextResponse.json({ error: 'AI 返回结果为空，请重试' }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: `网络请求失败：${message}` }, { status: 502 });
  }
}
