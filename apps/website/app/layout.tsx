import type { Metadata } from 'next';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Playfair_Display, Poppins } from 'next/font/google';

import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { canonical, openGraphFor } from '@/lib/metadata';

import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'optional',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-display',
  display: 'optional',
  preload: false,
});

export const metadata: Metadata = {
  title: 'goZaika — Discover. Pickup. Devour.',
  description:
    'Discover chef-curated BAM Bags from premium restaurants near you. Pickup-first, trust-led, and built for discovery.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? 'https://gozaika.vercel.app'),
  ...canonical('/'),
  openGraph: openGraphFor(
    '/',
    'goZaika — Discover. Pickup. Devour.',
    'Premium-access mystery meal drops with transparent trust details.',
  ),
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION ?? '',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="en" className={`${poppins.variable} ${playfair.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
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
