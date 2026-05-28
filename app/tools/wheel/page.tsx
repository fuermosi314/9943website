import ClientPage from './client';

export function generateMetadata() {
  return {
    title: '大转盘 - 9943小工具大全',
    description: '随机决策转盘，支持自定义选项',
    keywords: '选择困难, 帮我决定, 抽签',
  };
}

export default function Page() {
  return <ClientPage />;
}
