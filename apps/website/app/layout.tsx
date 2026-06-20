import type { Metadata } from 'next';
import { GoogleAnalytics } from '@next/third-parties/google';

import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { canonical, openGraphFor } from '@/lib/metadata';

import './globals.css';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://gozaika.in';

export const metadata: Metadata = {
  title: {
    default: 'goZaika — Discover. Pickup. Devour.',
    template: '%s | goZaika',
  },
  description:
    "India's first mystery meal-drop marketplace. Chef-curated BAM Bags from Hyderabad's finest kitchens — allergen-disclosed, pickup-only, always a surprise.",
  metadataBase: new URL(BASE_URL),
  ...canonical('/'),
  openGraph: openGraphFor(
    '/',
    'goZaika — Discover. Pickup. Devour.',
    "India's first mystery meal-drop marketplace. Chef-curated BAM Bags from Hyderabad's finest kitchens.",
  ),
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION ?? '',
  },
  keywords: [
    'mystery meal',
    'BAM Bag',
    'food discovery Hyderabad',
    'restaurant pickup Hyderabad',
    'chef curated food',
    'HITEC City food',
    'Banjara Hills restaurant',
    'Jubilee Hills food',
    'Kondapur pickup',
    'food surprise box Hyderabad',
  ],
};

const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': 'OnlineStore',
  name: 'goZaika',
  description:
    "India's first mystery meal-drop marketplace. Chef-curated BAM Bags from Hyderabad's finest kitchens, pickup-only.",
  url: BASE_URL,
  logo: `${BASE_URL}/logos/gozaika-logo-color.svg`,
  image: `${BASE_URL}/images/social/og-home-v3.png`,
  telephone: null,
  email: 'contact@gozaika.in',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Hyderabad',
    addressRegion: 'Telangana',
    addressCountry: 'IN',
  },
  areaServed: [
    { '@type': 'City', name: 'Hyderabad' },
  ],
  founder: {
    '@type': 'Organization',
    name: 'GoZaika Technologies Pvt. Ltd.',
  },
  sameAs: [
    'https://www.instagram.com/gozaika.in',
    'https://www.linkedin.com/company/gozaika',
  ],
} as const;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Header />
        <main id="main-content" tabIndex={-1} className="flex-1">
          {children}
        </main>
        <Footer />
        {process.env.NEXT_PUBLIC_GA_ID ? (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        ) : null}
      </body>
    </html>
  );
}
