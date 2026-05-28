import { Metadata } from 'next';
import ClientPage from './client';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: '字数统计 - 9943小工具大全',
    description: '统计文本字数、字符数、行数',
    keywords: '多少字, 字数, 字符数',
  };
}

export default function Page() {
  return <ClientPage />;
}
