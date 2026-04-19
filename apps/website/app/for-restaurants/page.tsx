import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { PartnerInterestForm } from '@/components/forms/PartnerInterestForm';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { forRestaurantsContent } from '@/lib/content';
import { canonical, openGraphFor, twitterFor } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Partner With goZaika',
  description:
    'A controlled-access discovery platform for restaurants: 12% pilot commission and zero delivery operations.',
  ...canonical('/for-restaurants'),
  openGraph: openGraphFor(
    '/for-restaurants',
    'Partner With goZaika',
    'Own the customer, recover margin, and preserve your brand.',
    '/images/social/og-home-v1.svg',
  ),
  twitter: twitterFor(
    'Partner With goZaika',
    'Own the customer, recover margin, and preserve your brand.',
    '/images/social/og-home-v1.svg',
  ),
};

export default function ForRestaurantsPage(): React.ReactElement {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-16 md:px-6 lg:px-8">
      <div className="grid items-center gap-6 md:grid-cols-2">
        <div>
          <h1 className="text-4xl font-bold text-gray900 md:text-5xl">
            {forRestaurantsContent.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray700">
            {forRestaurantsContent.subtitle}
          </p>
        </div>
        <Image
          src="/images/restaurant-hero-v2.svg"
          alt="Restaurant partner growth illustration"
          width={800}
          height={600}
          className="h-auto w-full rounded-xl"
          priority
        />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {forRestaurantsContent.valueProps.map((item) => (
          <Card key={item}>
            <p className="text-base text-gray700">{item}</p>
          </Card>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="text-3xl font-semibold text-gray900">Simple, transparent pricing</h2>
        <div className="mt-4 rounded-lg border border-gray200 bg-white">
          <ul className="divide-y divide-gray200">
            {forRestaurantsContent.commissionRows.map((row) => (
              <li key={row} className="px-4 py-3 text-sm text-gray700">
                {row}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-10 grid gap-8 md:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-3xl font-semibold text-gray900">
            Ready to become a goZaika partner?
          </h2>
          <p className="text-base text-gray700">
            Share your details and our team will connect with you within 48 hours.
          </p>
          <Link href="#partner-form">
            <Button>Express Partner Interest</Button>
          </Link>
        </div>
        <Card>
          <PartnerInterestForm />
        </Card>
      </section>
    </div>
  );
}
