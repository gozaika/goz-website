import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { howItWorksContent } from '@/lib/content';
import { canonical, openGraphFor, twitterFor } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'How a BAM Bag Works | goZaika',
  description:
    'Enough detail to trust it, enough mystery to love it. Browse, claim, and pickup with confidence.',
  ...canonical('/how-it-works'),
  openGraph: openGraphFor(
    '/how-it-works',
    'How a BAM Bag Works | goZaika',
    'A trust-first journey from discovery to pickup.',
    '/images/social/og-home-v1.svg',
  ),
  twitter: twitterFor(
    'How a BAM Bag Works | goZaika',
    'A trust-first journey from discovery to pickup.',
    '/images/social/og-home-v1.svg',
  ),
};

export default function HowItWorksPage(): React.ReactElement {
  const stepIcons = [
    '/images/step-browse-v2.svg',
    '/images/step-buy-v2.svg',
    '/images/step-pickup-v2.svg',
    '/images/hero-bam-bag-v1.svg',
  ] as const;

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-16 md:px-6 lg:px-8">
      <h1 className="text-4xl font-bold text-gray900 md:text-5xl">
        {howItWorksContent.title}
      </h1>
      <p className="mt-4 max-w-3xl text-lg text-gray700">{howItWorksContent.subtitle}</p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {howItWorksContent.steps.map((step, index) => (
          <Card key={step.heading} hover>
            <Image
              src={stepIcons[index] ?? '/images/step-browse-v2.svg'}
              alt={`${step.heading} icon`}
              width={80}
              height={80}
              className="mb-3 h-16 w-16"
            />
            <p className="text-xs font-semibold uppercase tracking-widest text-forest">
              Step {index + 1}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-gray900">{step.heading}</h2>
            <p className="mt-2 text-base text-gray700">{step.body}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-8 border-forest/20 bg-forestLight">
        <p className="text-sm font-medium text-forest">{howItWorksContent.allergenCallout}</p>
      </Card>

      <div className="mt-10">
        <Link href="/#waitlist">
          <Button>Join Waitlist</Button>
        </Link>
      </div>
    </div>
  );
}
