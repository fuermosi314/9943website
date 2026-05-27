import { NextRequest, NextResponse } from 'next/server';

// 网盘服务检测
interface CloudDriveInfo {
  service: string;
  serviceLabel: string;
  shareId: string;
  needsCode: boolean;
}

const CLOUD_DRIVE_PATTERNS: Array<{
  pattern: RegExp;
  service: string;
  serviceLabel: string;
  extractId: (url: string) => string | null;
}> = [
  {
    pattern: /pan\.quark\.cn\/s\//,
    service: 'quark',
    serviceLabel: '夸克网盘',
    extractId: (url) => {
      const m = url.match(/pan\.quark\.cn\/s\/([a-f0-9]+)/);
      return m ? m[1] : null;
    },
  },
  {
    pattern: /aliyundrive\.com\/s\//,
    service: 'aliyun',
    serviceLabel: '阿里云盘',
    extractId: (url) => {
      const m = url.match(/aliyundrive\.com\/s\/([a-zA-Z0-9]+)/);
      return m ? m[1] : null;
    },
  },
  {
    pattern: /www\.alipan\.com\/s\//,
    service: 'aliyun',
    serviceLabel: '阿里云盘',
    extractId: (url) => {
      const m = url.match(/alipan\.com\/s\/([a-zA-Z0-9]+)/);
      return m ? m[1] : null;
    },
  },
  {
    pattern: /pan\.baidu\.com\/s\//,
    service: 'baidu',
    serviceLabel: '百度网盘',
    extractId: (url) => {
      const m = url.match(/pan\.baidu\.com\/s\/([a-zA-Z0-9_-]+)/);
      return m ? m[1] : null;
    },
  },
  {
    pattern: /115\.com\/s\//,
    service: '115',
    serviceLabel: '115网盘',
    extractId: (url) => {
      const m = url.match(/115\.com\/s\/([a-zA-Z0-9]+)/);
      return m ? m[1] : null;
    },
  },
  {
    pattern: /cloud\.189\.cn\/share/,
    service: 'tianyi',
    serviceLabel: '天翼云盘',
    extractId: (url) => {
      const m = url.match(/\/share\/([a-zA-Z0-9]+)/);
      return m ? m[1] : null;
    },
  },
  {
    pattern: /xunlei\.com\/s\//,
    service: 'xunlei',
    serviceLabel: '迅雷云盘',
    extractId: (url) => {
      const m = url.match(/xunlei\.com\/s\/([a-zA-Z0-9]+)/);
      return m ? m[1] : null;
    },
  },
];

function detectCloudDrive(url: string): CloudDriveInfo | null {
  for (const dp of CLOUD_DRIVE_PATTERNS) {
    if (dp.pattern.test(url)) {
      const shareId = dp.extractId(url);
      if (shareId) {
        return {
          service: dp.service,
          serviceLabel: dp.serviceLabel,
          shareId,
          needsCode: dp.service === 'baidu' || dp.service === '115',
        };
      }
    }
  }
  return null;
}

// alist API 解析
async function parseWithAlist(
  alistUrl: string,
  shareUrl: string,
  code: string,
  service: string,
): Promise<{ downloadUrl: string; fileName: string; fileSize: number }> {
  // 1. 添加分享链接到 alist
  const addResp = await fetch(`${alistUrl}/api/fs/add_share`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.ALIST_TOKEN ? { Authorization: process.env.ALIST_TOKEN } : {}),
    },
    body: JSON.stringify({
      share_link: shareUrl,
      share_code: code || undefined,
      expiration: 60,
    }),
    signal: AbortSignal.timeout(30000),
  });

  const addData = await addResp.json();
  if (addData.code !== 200) {
    throw new Error(addData.message || 'alist 添加分享失败');
  }

  const shareId = addData.data?.share_id;
  if (!shareId) {
    throw new Error('未获取到 share_id');
  }

  // 2. 获取分享文件列表
  const listResp = await fetch(`${alistUrl}/api/fs/share_link/${shareId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.ALIST_TOKEN ? { Authorization: process.env.ALIST_TOKEN } : {}),
    },
    body: JSON.stringify({
      page: 1,
      per_page: 100,
      password: code || undefined,
    }),
    signal: AbortSignal.timeout(30000),
  });

  const listData = await listResp.json();
  if (listData.code !== 200) {
    throw new Error(listData.message || '获取文件列表失败');
  }

  const files = listData.data?.content || [];
  if (files.length === 0) {
    throw new Error('未找到可下载的文件');
  }

  // 选择第一个文件（或最大的文件）
  const file = files.length === 1 ? files[0] : files.reduce((a: Record<string, number>, b: Record<string, number>) => (a.size > b.size ? a : b));

  // 3. 获取文件下载链接
  const filePath = file.path || `/${file.name}`;
  const getResp = await fetch(`${alistUrl}/api/fs/get`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.ALIST_TOKEN ? { Authorization: process.env.ALIST_TOKEN } : {}),
    },
    body: JSON.stringify({
      path: filePath,
      password: code || undefined,
    }),
    signal: AbortSignal.timeout(30000),
  });

  const getData = await getResp.json();
  if (getData.code !== 200) {
    throw new Error(getData.message || '获取下载链接失败');
  }

  const rawUrl = getData.data?.raw_url;
  if (!rawUrl) {
    throw new Error('未获取到直链');
  }

  return {
    downloadUrl: rawUrl,
    fileName: getData.data?.name || file.name || 'download',
    fileSize: getData.data?.size || file.size || 0,
  };
}

export async function POST(request: NextRequest) {
  let body: { url?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  const { url: shareUrl, code } = body;
  if (!shareUrl) {
    return NextResponse.json({ error: '请提供网盘分享链接' }, { status: 400 });
  }

  // 检测是否为网盘链接
  const cloudInfo = detectCloudDrive(shareUrl);
  if (!cloudInfo) {
    return NextResponse.json({ error: '未识别的网盘链接，支持：夸克网盘、阿里云盘、百度网盘、115网盘、天翼云盘、迅雷云盘' });
  }

  // 检查 alist 配置
  const alistUrl = process.env.ALIST_URL;
  if (!alistUrl) {
    return NextResponse.json({
      error: '解析服务未配置',
      details: '请在 .env.local 中配置 ALIST_URL（alist 服务地址）',
      service: cloudInfo.serviceLabel,
    });
  }

  try {
    const result = await parseWithAlist(alistUrl, shareUrl, code || '', cloudInfo.service);
    return NextResponse.json({
      downloadUrl: result.downloadUrl,
      fileName: result.fileName,
      fileSize: result.fileSize,
      service: cloudInfo.serviceLabel,
    });
  } catch (err) {
    return NextResponse.json({
      error: `解析失败: ${(err as Error).message}`,
      service: cloudInfo.serviceLabel,
    });
  }
}
