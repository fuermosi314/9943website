import ClientPage from './client';

export function generateMetadata() {
  return {
    title: 'Everything 下载 - 9943小工具大全',
    description: 'Everything 文件秒搜工具官方下载，支持 Windows',
    keywords: '文件搜索, everything, 秒搜, 文件管理',
  };
}

export default function Page() {
  return <ClientPage />;
}
