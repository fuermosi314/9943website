import ClientPage from './client';

export function generateMetadata() {
  return {
    title: '图片调整大小 - 9943小工具大全',
    description: '按比例或像素调整图片尺寸',
    keywords: '放大图片, 缩小图片, 改变尺寸',
  };
}

export default function Page() {
  return <ClientPage />;
}
