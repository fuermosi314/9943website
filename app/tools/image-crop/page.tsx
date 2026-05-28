import ClientPage from './client';

export function generateMetadata() {
  return {
    title: '图片裁剪 - 9943小工具大全',
    description: '自定义区域裁剪图片',
    keywords: '裁切图片, 截取部分, 图片裁切',
  };
}

export default function Page() {
  return <ClientPage />;
}
