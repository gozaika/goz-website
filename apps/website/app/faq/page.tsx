import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

import { faqs } from '@/lib/faqs';
import { canonical, openGraphFor, twitterFor } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions | goZaika',
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
    <>
      <section className="bg-cream">
        <div className="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <h1 className="heading-page text-gray900">Frequently asked questions</h1>
          <p className="text-lead mt-4 max-w-3xl text-gray700">
            We answer the core trust, pickup, and partner questions below.
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white">
            {faqs.map((faq) => (
              <details key={faq.id} className="group border-b border-gray100">
                <summary className="flex cursor-pointer list-none items-center justify-between py-5 text-left text-base font-semibold text-gray900 transition-colors hover:text-forest">
                  <span>{faq.question}</span>
                  <ChevronDown className="h-5 w-5 shrink-0 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <div className="pb-5 text-sm leading-relaxed text-gray600">
                  <p>{faq.answer}</p>
                </div>
              </details>
            ))}
          </div>

          <div className="mt-12 rounded-2xl bg-forest-light p-8 text-center">
            <p className="mb-2 font-semibold text-forest">Still have questions?</p>
            <Link
              href="/contact"
              className="inline-block rounded-md bg-forest px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-forest/95"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
