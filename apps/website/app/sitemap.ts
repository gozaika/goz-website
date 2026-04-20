import type { MetadataRoute } from 'next';

import { getAllBlogPosts } from '@/lib/blog';

const routes = [
  '',
  '/blog',
  '/partner-portal',
  '/cities',
  '/company',
  '/company/leadership',
  '/company/culture',
  '/company/careers',
  '/company/investors',
  '/how-it-works',
  '/for-restaurants',
  '/about',
  '/faq',
  '/contact',
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

  return allRoutes.map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : 0.8,
  }));
}
