import { MetadataRoute } from 'next';
import { tools } from '@/lib/tools';

const BASE_URL = 'https://www.fuermosi.top';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const home = {
    url: BASE_URL,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 1,
  };

  const toolPages = tools.map(tool => ({
    url: `${BASE_URL}${tool.path}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: tool.category === 'website' ? 0.6 : 0.8,
  }));

  return [home, ...toolPages];
}
