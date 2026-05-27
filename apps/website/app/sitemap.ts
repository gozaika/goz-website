import type { MetadataRoute } from 'next';

import { getAllBlogPosts } from '@/lib/blog';

const routes = [
  '',
  '/how-it-works',
  '/for-restaurants',
  '/insider',
  '/about',
  '/faq',
  '/contact',
  '/blog',
  '/partner-portal',
  '/cities',
  '/company',
  '/company/leadership',
  '/company/culture',
  '/company/careers',
  '/company/investors',
  '/privacy-policy',
  '/terms-of-service',
  '/refund-policy',
  '/food-safety-policy',
  '/grievance-redressal',
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://gozaika.vercel.app';
  const blogRoutes = getAllBlogPosts().map((post) => `/blog/${post.slug}`);
  const allRoutes = [...routes, ...blogRoutes];

  const highPriority = new Set(['', '/how-it-works', '/for-restaurants', '/insider', '/faq']);
  const medPriority = new Set(['/about', '/contact', '/blog', '/cities']);

  return allRoutes.map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
    changeFrequency: (route === '' || route === '/insider' ? 'weekly' : 'monthly') as MetadataRoute.Sitemap[0]['changeFrequency'],
    priority: route === '' ? 1 : highPriority.has(route) ? 0.9 : medPriority.has(route) ? 0.7 : 0.5,
  }));
}
