import ClientPage from './client';

export function generateMetadata() {
  return {
    title: '图片格式转换 - 9943小工具大全',
    description: 'JPG/PNG/WebP/BMP 格式互转',
    keywords: 'png转jpg, jpg转png, 图片转格式',
  };
}

export default function Page() {
  return <ClientPage />;
}
