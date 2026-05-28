import { Metadata } from 'next';
import ClientPage from './client';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: '耗知通 - 9943小工具大全',
    description: '记录你的消耗品，清楚库存',
    keywords: '消耗品管理, 库存记录, 日用品',
  };
}

export default function Page() {
  return <ClientPage />;
}
