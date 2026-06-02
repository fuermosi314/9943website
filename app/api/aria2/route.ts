import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { host, port, secret, method, params } = body;

    const aria2Host = host || 'localhost';
    const aria2Port = port || '6800';
    const rpcUrl = `http://${aria2Host}:${aria2Port}/jsonrpc`;

    const rpcBody: Record<string, unknown> = {
      jsonrpc: '2.0',
      id: Date.now().toString(),
      method,
      params: params || [],
    };
    if (secret) rpcBody.params = [`token:${secret}`, ...(params || [])];

    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rpcBody),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'aria2 连接失败';
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}
