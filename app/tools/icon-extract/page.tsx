import { Metadata } from 'next';
import ClientPage from './client';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: '图标提取 - 9943小工具大全',
    description: '从 EXE/DLL/ICO 文件中提取图标',
    keywords: '提取exe图标, 软件图标',
  };
}

export default function Page() {
  return <ClientPage />;
}
