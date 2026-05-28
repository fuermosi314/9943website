import { Metadata } from 'next';
import ClientPage from './client';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: '天机阁 - 9943小工具大全',
    description: '天机阁，一览无余',
    keywords: '收纳, 物品管理, 找不到东西',
  };
}

export default function Page() {
  return <ClientPage />;
}
