/**
 * @file apps/website/lib/metadata.ts
 * @description Metadata helpers for canonical URLs and OpenGraph defaults.
 */

import type { Metadata } from 'next';

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL ?? 'https://gozaika.vercel.app';

/**
 * Creates canonical metadata object for a route path.
 *
 * @param path - Route path beginning with `/`.
 * @returns Metadata alternates object containing canonical URL.
 */
export function canonical(path: string): Pick<Metadata, 'alternates'> {
  return {
    alternates: {
      canonical: `${baseUrl}${path}`,
    },
  };
}

/**
 * Returns shared OpenGraph defaults for page metadata.
 *
 * @param path - Route path beginning with `/`.
 * @param title - OpenGraph title.
 * @param description - OpenGraph description.
 * @returns OpenGraph metadata object.
 */
export function openGraphFor(
  path: string,
  title: string,
  description: string,
  imagePath = '/images/social/og-home-v2.svg',
): Metadata['openGraph'] {
  return {
    title,
    description,
    url: `${baseUrl}${path}`,
    siteName: 'goZaika',
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: `${baseUrl}${imagePath}`,
        width: 1200,
        height: 630,
        alt: `${title} preview image`,
      },
    ],
  };
}

/**
 * Returns Twitter card metadata aligned with selected OG image.
 *
 * @param title - Twitter title.
 * @param description - Twitter description.
 * @param imagePath - Public image path used for Twitter preview cards.
 * @returns Twitter metadata object.
 */
export function twitterFor(
  title: string,
  description: string,
  imagePath = '/images/social/og-home-v2.svg',
): Metadata['twitter'] {
  return {
    card: 'summary_large_image',
    title,
    description,
    images: [
      {
        url: `${baseUrl}${imagePath}`,
        alt: `${title} preview image`,
      },
    ],
  };
}
