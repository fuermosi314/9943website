import { Metadata } from 'next';
import ClientPage from './client';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: '毁灭地球的电磁炮 - 9943小工具大全',
    description: '太空汪星人的电磁炮小游戏',
    keywords: '电磁炮, 毁灭地球, 小游戏',
  };
}

export default function Page() {
  return <ClientPage />;
}
