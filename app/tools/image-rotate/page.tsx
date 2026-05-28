import { Metadata } from 'next';
import ClientPage from './client';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: '图片旋转/翻转 - 9943小工具大全',
    description: '旋转角度、水平/垂直翻转',
    keywords: '图片转方向, 镜像翻转',
  };
}

export default function Page() {
  return <ClientPage />;
}
