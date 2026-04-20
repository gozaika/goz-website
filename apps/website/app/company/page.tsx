import type { Metadata } from 'next';
import Link from 'next/link';

import { companyOverview } from '@/lib/company';
import { canonical, openGraphFor, twitterFor } from '@/lib/metadata';

const companyPages = [
  {
    title: 'Leadership',
    href: '/company/leadership',
    body: 'Founder context, leadership mandates, and the kind of operating bench goZaika is designed to build.',
  },
  {
    title: 'Culture',
    href: '/company/culture',
    body: 'How the team works, what standards matter, and why city-first discipline is part of the product.',
  },
  {
    title: 'Careers',
    href: '/company/careers',
    body: 'Open the conversation for people who want to build hospitality infrastructure with product and operating rigor.',
  },
  {
    title: 'Investors',
    href: '/company/investors',
    body: 'Market thesis, why Hyderabad first, and why brand-safe restaurant demand is a real category opportunity.',
  },
] as const;

export const metadata: Metadata = {
  title: 'Company | goZaika',
  description:
    'Leadership, culture, careers, and investor context for goZaika.',
  ...canonical('/company'),
  openGraph: openGraphFor(
    '/company',
    'Company | goZaika',
    'Leadership, culture, careers, and investor context for goZaika.',
  ),
  twitter: twitterFor(
    'Company | goZaika',
    'Leadership, culture, careers, and investor context for goZaika.',
  ),
};

export default function CompanyPage(): React.ReactElement {
  return (
    <>
      <section className="bg-cream">
        <div className="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-forest">Company</p>
          <h1 className="heading-page mt-4 max-w-4xl text-gray900">
            The company behind the category.
          </h1>
          <p className="text-lead mt-4 max-w-3xl text-gray700">{companyOverview.body}</p>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2">
            {companyPages.map((page) => (
              <article
                key={page.href}
                className="rounded-2xl border border-gray100 bg-white p-6 shadow-[0_10px_30px_rgba(26,92,56,0.08)]"
              >
                <h2 className="text-xl font-semibold text-gray900">{page.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-gray700">{page.body}</p>
                <Link
                  href={page.href}
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-saffron px-5 text-sm font-semibold text-gray900 transition-colors hover:bg-[var(--color-saffron-hover)]"
                >
                  Explore {page.title}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
