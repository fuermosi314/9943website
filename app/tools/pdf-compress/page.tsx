import { Metadata } from 'next';
import ClientPage from './client';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'PDF 压缩 - 9943小工具大全',
    description: '减小 PDF 文件大小',
    keywords: 'pdf瘦身, 减小pdf',
  };
}

export default function Page() {
  return <ClientPage />;
}
