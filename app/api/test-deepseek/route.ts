import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'No API key' });
  }

  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 20,
        messages: [{ role: 'user', content: 'say hi' }],
      }),
      signal: AbortSignal.timeout(15000),
    });

    const data = await res.json();
    return NextResponse.json({ status: res.status, ok: res.ok, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message });
  }
}
