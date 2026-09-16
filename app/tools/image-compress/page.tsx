import ClientPage from './client';

export function generateMetadata() {
  return {
    title: '图片压缩 - 9943小工具大全',
    description: '压缩图片体积，各种常见图片都能压，可输出 WebP 或 JPG，一次处理一张',
    keywords: '图片, 压缩, image, compress',
  };
}

export default function Page() {
  return <ClientPage />;
}
