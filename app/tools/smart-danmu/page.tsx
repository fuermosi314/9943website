import ClientPage from './client';

export function generateMetadata() {
  return {
    title: '智能弹幕 - 9943小工具大全',
    description: '桌面弹幕助手，AI生成弹幕，让桌面不再孤单',
    keywords: '弹幕, 桌面, AI, 陪伴, 直播',
  };
}

export default function Page() {
  return <ClientPage />;
}
