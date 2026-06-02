import ClientPage from './client';

export function generateMetadata() {
  return {
    title: 'TreeSize 下载 - 9943小工具大全',
    description: 'TreeSize Free 免费下载，专业磁盘空间分析工具',
    keywords: 'treesize, 磁盘分析, 大文件查找, 磁盘清理, 空间分析',
  };
}

export default function Page() {
  return <ClientPage />;
}
