import ClientPage from './client';

export function generateMetadata() {
  return {
    title: 'Watt Toolkit 下载 - 9943小工具大全',
    description: 'Watt Toolkit (原 Steam++) 官方下载，Steam 加速/令牌/多账号管理',
    keywords: 'steam加速, watt toolkit, steam++, 令牌管理',
  };
}

export default function Page() {
  return <ClientPage />;
}
