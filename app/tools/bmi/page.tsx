import { Metadata } from 'next';
import ClientPage from './client';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'BMI 计算器 - 9943小工具大全',
    description: '计算身体质量指数，支持公制/英制',
    keywords: '胖瘦, 体重指数, 身高体重',
  };
}

export default function Page() {
  return <ClientPage />;
}
