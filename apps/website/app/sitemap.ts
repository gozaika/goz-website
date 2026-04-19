import type { MetadataRoute } from 'next';

const routes = [
  '',
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

  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : 0.8,
  }));
}
