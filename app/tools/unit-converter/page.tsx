import { Metadata } from 'next';
import ClientPage from './client';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: '单位换算 - 9943小工具大全',
    description: '长度、重量、温度、面积、体积、时间单位互转',
    keywords: '米换算英尺, 公斤磅',
  };
}

export default function Page() {
  return <ClientPage />;
}
