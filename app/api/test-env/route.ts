import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  return NextResponse.json({
    hasApiKey: !!apiKey,
    keyPrefix: apiKey ? apiKey.substring(0, 8) + '...' : 'NOT SET',
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'NOT SET',
    model: process.env.DEEPSEEK_MODEL || 'NOT SET',
  });
}
