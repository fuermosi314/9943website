import { Metadata } from 'next';
import ClientPage from './client';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: '二维码生成 - 9943小工具大全',
    description: '生成自定义二维码，支持调整大小和颜色',
    keywords: '扫码, qr码, 二维码制作',
  };
}

export default function Page() {
  return <ClientPage />;
}
