import ClientPage from './client';

export function generateMetadata() {
  return {
    title: '视频去水印 - 9943小工具大全',
    description: '抖音/TikTok/B站/西瓜视频无水印下载，支持多平台',
    keywords: '下载视频, 保存视频, 抖音下载, TikTok下载, 去水印',
  };
}

export default function Page() {
  return <ClientPage />;
}
