import ClientPage from './client';

export function generateMetadata() {
  return {
    title: 'PDF 合并 - 9943小工具大全',
    description: '多个 PDF 合并为一个文件',
    keywords: '多个pdf, 合并文件',
  };
}

export default function Page() {
  return <ClientPage />;
}
