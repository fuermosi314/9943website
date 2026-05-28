import { Metadata } from 'next';
import ClientPage from './client';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: '爆款开头生成器 - 9943小工具大全',
    description: 'AI 生成10个不同风格的爆款开头，支持多平台',
    keywords: '标题生成, 文案写作, 自媒体',
  };
}

export default function Page() {
  return <ClientPage />;
}
