import { NextResponse } from 'next/server';

// GitHub 镜像代理列表（更新此文件即可，无需重新部署前端）
const GITHUB_MIRRORS = [
  { name: 'gh-proxy', prefix: 'https://gh-proxy.com/' },
  { name: 'ghfast', prefix: 'https://ghfast.top/' },
  { name: 'ghproxy', prefix: 'https://ghproxy.cc/' },
  { name: 'moeyy', prefix: 'https://github.moeyy.xyz/' },
];

export async function GET() {
  return NextResponse.json({ mirrors: GITHUB_MIRRORS });
}
