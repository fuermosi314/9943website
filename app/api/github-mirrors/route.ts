import { NextResponse } from 'next/server';

// GitHub 镜像代理列表（更新此文件即可，无需重新部署前端）
const GITHUB_MIRRORS = [
  { name: 'gh-proxy', prefix: 'https://gh-proxy.com/' },
  { name: 'ghfast', prefix: 'https://ghfast.top/' },
  { name: 'ur1', prefix: 'https://github.ur1.fun/' },
  { name: 'llkk', prefix: 'https://gh.llkk.cc/' },
];

export async function GET() {
  return NextResponse.json({ mirrors: GITHUB_MIRRORS });
}
