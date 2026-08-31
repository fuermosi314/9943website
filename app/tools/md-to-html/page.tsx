import ClientPage from './client';

export function generateMetadata() {
  return {
    title: '文档转换 - Markdown/HTML/PDF 互转 - 9943小工具大全',
    description: 'Markdown 转 HTML、HTML 转 Markdown、HTML 转 PDF、PDF 转 Markdown，支持实时预览和下载',
    keywords: 'markdown转html, md转html, html转markdown, html转pdf, pdf转markdown, pdf转html, markdown渲染, 文档转换',
  };
}

export default function Page() {
  return <ClientPage />;
}
