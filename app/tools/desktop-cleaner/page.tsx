import ClientPage from './client';

export function generateMetadata() {
  return {
    title: 'AI智能桌面整理大师 - 9943小工具大全',
    description: 'AI驱动的桌面图标整理工具，一键优化桌面布局',
    keywords: '桌面整理, 图标整理, 桌面清理, AI',
  };
}

export default function Page() {
  return <ClientPage />;
}
