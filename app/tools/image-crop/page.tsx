import { Metadata } from 'next';
import ClientPage from './client';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: '图片裁剪 - 9943小工具大全',
    description: '自定义区域裁剪图片',
    keywords: '裁切图片, 截取部分, 图片裁切',
  };
}

export default function Page() {
  return <ClientPage />;
}
