import ClientPage from './client';

export function generateMetadata() {
  return {
    title: '图片压缩 - 9943小工具大全',
    description: '压缩图片大小，支持 JPG、PNG、WebP',
    keywords: '图片, 压缩, image, compress',
  };
}

export default function Page() {
  return <ClientPage />;
}
