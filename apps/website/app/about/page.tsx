import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { aboutContent } from '@/lib/content';
import { canonical, openGraphFor, twitterFor } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'About goZaika',
  description:
    'goZaika exists to build a trust-led discovery layer for premium restaurant food access.',
  ...canonical('/about'),
  openGraph: openGraphFor(
    '/about',
    'About goZaika',
    'Mission, values, and launch principles behind goZaika.',
  ),
  twitter: twitterFor(
    'About goZaika',
    'Mission, values, and launch principles behind goZaika.',
  ),
};

export default function AboutPage(): React.ReactElement {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-16 md:px-6 lg:px-8">
      <h1 className="text-4xl font-bold text-gray900 md:text-5xl">{aboutContent.title}</h1>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          {aboutContent.paragraphs.map((paragraph) => (
            <p key={paragraph} className="max-w-4xl text-base leading-relaxed text-gray700">
              {paragraph}
            </p>
          ))}
        </div>
        <Image
          src="/images/about-illustration-v1.svg"
          alt="About goZaika visual showing curated bag on kitchen counter"
          width={800}
          height={600}
          className="h-auto w-full rounded-xl"
        />
      </div>

      <Card className="mt-8 border-forest/20 bg-forestLight">
        <p className="text-lg font-medium text-forest">{aboutContent.mission}</p>
      </Card>

      <section className="mt-8">
        <h2 className="text-3xl font-semibold text-gray900">What we believe</h2>
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {aboutContent.values.map((value) => (
            <li key={value} className="rounded-md border border-gray200 bg-white p-4 text-sm text-gray700">
              {value}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8 flex gap-3">
        <Link href="/#waitlist">
          <Button>Join Waitlist</Button>
        </Link>
        <Link href="/for-restaurants">
          <Button variant="secondary">For Restaurants</Button>
        </Link>
      </div>
    </div>
  );
}
