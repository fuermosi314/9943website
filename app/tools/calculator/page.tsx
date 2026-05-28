import { Metadata } from 'next';
import ClientPage from './client';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: '专业计算器 - 9943小工具大全',
    description: '标准/科学/程序员/日期四种模式',
    keywords: '算数, 数学, 三角函数, 进制转换',
  };
}

export default function Page() {
  return <ClientPage />;
}
