import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '9943小工具大全 - 简单好用的在线工具集',
  description: '为你精心准备的效率工具集，包含图片压缩、二维码生成、字数统计等实用工具，让工作更轻松。',
  keywords: '在线工具, 效率工具, 图片压缩, 二维码生成, 字数统计',
  icons: { icon: '/favicon.png' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="scroll-smooth">
      <body className="antialiased">{children}</body>
    </html>
  );
}
