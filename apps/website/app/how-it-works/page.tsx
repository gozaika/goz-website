import type { Metadata } from 'next';
import Link from 'next/link';

import { HowItWorksFlow } from '@/components/sections/HowItWorksFlow';
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
  return (
    <>
      <section className="bg-cream">
        <div className="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <h1 className="heading-page max-w-3xl text-gray900">{howItWorksContent.title}</h1>
          <p className="text-lead mt-4 max-w-3xl text-gray700">{howItWorksContent.subtitle}</p>
        </div>
      </section>

      <HowItWorksFlow
        className="bg-white"
        title="The three-step flow"
        steps={howItWorksContent.steps.map((step) => ({
          title: step.heading,
          description: step.body,
          icon: step.icon,
        }))}
      />

      <section className="bg-cream">
        <div className="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-forest-light bg-forest-light p-6">
            <h2 className="heading-section text-gray900">Trust before pickup</h2>
            <p className="mt-3 text-base text-gray700">{howItWorksContent.allergenCallout}</p>
          </div>

          <div className="mt-10">
            <Link
              href="/#waitlist"
              className="inline-flex h-12 items-center justify-center rounded-md bg-saffron px-6 text-base font-semibold text-gray900 transition-colors hover:bg-[var(--color-saffron-hover)]"
            >
              Join Waitlist
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
