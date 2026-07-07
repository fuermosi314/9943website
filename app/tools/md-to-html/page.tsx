import ClientPage from './client';

export function generateMetadata() {
  return {
    title: 'Markdown 转 HTML - 9943小工具大全',
    description: '将 Markdown 文件或代码转换为 HTML，支持实时预览和下载',
    keywords: 'markdown转html, md转html, markdown渲染, html生成, markdown预览',
  };
}

export default function Page() {
  return <ClientPage />;
}
