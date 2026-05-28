import ClientPage from './client';

export function generateMetadata() {
  return {
    title: '简单记 - 9943小工具大全',
    description: '简单好用的日记工具，记录每天的心情和故事',
    keywords: '日记, 笔记, 记事, 心情',
  };
}

export default function Page() {
  return <ClientPage />;
}
