import { NextRequest, NextResponse } from 'next/server';

// PDF → Markdown AI 增强：客户端先用 pdf.js 提取纯文本（每页一个字符串），
// 服务端分块调用 DeepSeek 还原 Markdown 结构

interface PdfToMdRequest {
  pages: string[];
}

const MAX_PAGES = 100;
const MAX_CHARS = 200_000;
const CHUNK_SIZE = 4000;

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

function buildPrompt(chunk: string, totalChunks: number, index: number): string {
  return `你是文档结构还原助手。以下是 PDF 文档按页提取的纯文本中的第 ${index + 1}/${totalChunks} 部分（标题/列表/表格等结构已丢失，只剩文字和换行）。

${chunk}

请把这段文本还原为结构完整的 Markdown：
- 根据内容语义判断标题层级（# / ## / ###）
- 识别有序/无序列表、代码块、引用
- 表格用 Markdown 表格还原
- 不要编造原文没有的内容
- 只输出 Markdown 内容本身，不要任何解释、前言或代码块包裹`;
}

async function callDeepSeek(chunk: string, totalChunks: number, index: number): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const rawBase = process.env.DEEPSEEK_BASE_URL;
  const baseURL = rawBase && /^https?:\/\//i.test(rawBase) ? rawBase : 'https://api.deepseek.com';
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4.1-flash';

  const res = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      temperature: 0.2,
      messages: [{ role: 'user', content: buildPrompt(chunk, totalChunks, index) }],
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`AI 服务调用失败（${res.status}）: ${errBody.slice(0, 200)}`);
  }
  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? '') as string;
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

  let body: PdfToMdRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const { pages } = body;
  if (!Array.isArray(pages) || pages.length === 0) {
    return NextResponse.json({ error: 'PDF 文本为空，无法转换' }, { status: 400 });
  }
  if (pages.length > MAX_PAGES) {
    return NextResponse.json({ error: `PDF 页数超过上限（${MAX_PAGES} 页）` }, { status: 400 });
  }

  const fullText = pages.join('\n');
  if (fullText.trim().length === 0) {
    return NextResponse.json({ error: 'PDF 中未提取到文字（可能是扫描版 PDF）' }, { status: 400 });
  }
  if (fullText.length > MAX_CHARS) {
    return NextResponse.json({ error: `文档过大（超过 ${MAX_CHARS} 字符），请拆分后重试` }, { status: 400 });
  }

  // 分块：超长文档逐块还原后拼接
  const chunks: string[] = [];
  for (let i = 0; i < fullText.length; i += CHUNK_SIZE) {
    chunks.push(fullText.slice(i, i + CHUNK_SIZE));
  }

  try {
    const results: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const text = await callDeepSeek(chunks[i], chunks.length, i);
      if (text.trim()) results.push(text.trim());
    }
    if (results.length === 0) {
      return NextResponse.json({ error: 'AI 返回结果为空，请重试' }, { status: 502 });
    }
    return NextResponse.json({ markdown: results.join('\n\n') });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
