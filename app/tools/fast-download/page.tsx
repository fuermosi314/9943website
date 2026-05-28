import { Metadata } from 'next';
import ClientPage from './client';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: '高速下载 - 9943小工具大全',
    description: '多线程并行下载，充分利用你的带宽',
    keywords: '加速下载, 下载加速, 多线程下载',
  };
}

export default function Page() {
  return <ClientPage />;
}
