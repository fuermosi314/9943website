import ClientPage from './client';

export function generateMetadata() {
  return {
    title: '网易UU远程 下载 - 9943小工具大全',
    description: '网易UU远程客户端官方下载地址，支持 Windows/macOS/Android/iOS/Android TV',
    keywords: '网易UU远程, uu远程, 远程控制, 远程桌面, 免费远程软件',
  };
}

export default function Page() {
  return <ClientPage />;
}
