import { Metadata } from 'next';
import ClientPage from './client';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: '在线编译器 - 9943小工具大全',
    description: 'C/C++、Python、Java、Go 等语言在线编译器导航',
    keywords: '在线编程, 写代码, 运行代码',
  };
}

export default function Page() {
  return <ClientPage />;
}
