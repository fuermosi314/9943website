import ClientPage from './client';

export function generateMetadata() {
  return {
    title: 'Office 转 PDF - 9943小工具大全',
    description: 'Word/Excel/PPT 转 PDF',
    keywords: 'word转pdf, excel转pdf',
  };
}

export default function Page() {
  return <ClientPage />;
}
