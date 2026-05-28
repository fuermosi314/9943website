import { Metadata } from 'next';
import ClientPage from './client';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'PDF 拆分 - 9943小工具大全',
    description: 'PDF 拆分为多个独立文件',
    keywords: '分离pdf, 提取页面',
  };
}

export default function Page() {
  return <ClientPage />;
}
