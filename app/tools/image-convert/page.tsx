import ClientPage from './client';

export function generateMetadata() {
  return {
    title: '图片格式转换 - 9943小工具大全',
    description: 'JPG、PNG、WebP 三种格式互转，输出格式可选',
    keywords: 'png转jpg, jpg转png, 图片转格式',
  };
}

export default function Page() {
  return <ClientPage />;
}
