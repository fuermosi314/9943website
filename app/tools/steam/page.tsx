import ClientPage from './client';

export function generateMetadata() {
  return {
    title: 'Steam 下载 - 9943小工具大全',
    description: 'Steam 客户端官方下载地址，支持 Windows/Mac/Linux',
    keywords: '游戏平台, steam安装',
  };
}

export default function Page() {
  return <ClientPage />;
}
