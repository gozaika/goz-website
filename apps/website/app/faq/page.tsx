import type { Metadata } from 'next';
import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { faqs } from '@/lib/faqs';
import { canonical, openGraphFor, twitterFor } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'FAQ | goZaika',
  description:
    'Everything you need to know about BAM Bags, pickup, trust details, and partner onboarding.',
  ...canonical('/faq'),
  openGraph: openGraphFor(
    '/faq',
    'FAQ | goZaika',
    'Answers for both consumers and restaurant partners.',
  ),
  twitter: twitterFor(
    'FAQ | goZaika',
    'Answers for both consumers and restaurant partners.',
  ),
};

export default function FaqPage(): React.ReactElement {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-16 md:px-6 lg:px-8">
      <h1 className="text-4xl font-bold text-gray900 md:text-5xl">Frequently asked questions</h1>
      <p className="mt-4 max-w-3xl text-base text-gray700">
        We answer the core trust, pickup, and partner questions below.
      </p>

      <div className="mt-8 space-y-3">
        {faqs.map((faq) => (
          <details key={faq.id} className="rounded-md border border-gray200 bg-white p-4">
            <summary className="cursor-pointer text-base font-semibold text-gray900">
              {faq.question}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-gray700">{faq.answer}</p>
          </details>
        ))}
      </div>

      <div className="mt-8 flex gap-3">
        <Link href="/#waitlist">
          <Button>Join Waitlist</Button>
        </Link>
        <Link href="/contact" className="self-center text-sm font-medium text-forest underline">
          Contact us
        </Link>
      </div>
    </div>
  );
}
