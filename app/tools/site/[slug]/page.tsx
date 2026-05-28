import { tools } from '@/lib/tools';
import SiteDetailClient from './client';

const SITE_NAME = '9943小工具大全';

export function generateMetadata({ params }: { params: { slug: string } }) {
  const tool = tools.find(t => t.id === params.slug);
  if (!tool) {
    return { title: `${SITE_NAME} - 简单好用的在线工具集` };
  }
  return {
    title: `${tool.name} - ${SITE_NAME}`,
    description: tool.description,
    keywords: tool.keywords?.join(', ') || tool.tags.join(', '),
  };
}

export default function SiteDetailPage() {
  return <SiteDetailClient />;
}
