import { Metadata } from 'next';
import ClientPage from './client';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: '随机数生成器 - 9943小工具大全',
    description: '生成随机数、字符串、UUID、密码',
    keywords: '随机数, 抽签, uuid生成',
  };
}

export default function Page() {
  return <ClientPage />;
}
