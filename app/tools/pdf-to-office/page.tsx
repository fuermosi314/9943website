import ClientPage from './client';

export function generateMetadata() {
  return {
    title: 'PDF 转 Office - 9943小工具大全',
    description: 'PDF 转 Word/Excel/PPT',
    keywords: 'pdf转word, pdf转excel',
  };
}

export default function Page() {
  return <ClientPage />;
}
