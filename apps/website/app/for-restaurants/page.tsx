import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { PackageCheck, Percent, ShieldCheck } from 'lucide-react';

import { PartnerInterestForm } from '@/components/forms/PartnerInterestForm';
import { forRestaurantsContent } from '@/lib/content';
import { canonical, openGraphFor, twitterFor } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Partner With goZaika | For Restaurants',
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
  const differentiatorIcons = [ShieldCheck, Percent, PackageCheck] as const;

  return (
    <>
      <section className="bg-cream">
        <div className="mx-auto grid max-w-screen-xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
          <div>
            <h1 className="heading-page max-w-3xl text-gray900">
              {forRestaurantsContent.title}
            </h1>
            <p className="text-lead mt-4 max-w-2xl text-gray700">
              {forRestaurantsContent.subtitle}
            </p>
            <Link
              href="#partner-form"
              className="mt-8 inline-flex h-12 items-center justify-center rounded-md bg-saffron px-6 text-base font-semibold text-gray900 transition-colors hover:bg-[var(--color-saffron-hover)]"
            >
              Express Partner Interest
            </Link>
          </div>
          <Image
            src="/images/restaurant-hero-v2.svg"
            alt="Restaurant partner growth illustration"
            width={800}
            height={600}
            className="h-auto w-full rounded-3xl bg-white p-4 shadow-[0_10px_30px_rgba(26,92,56,0.08)]"
            priority
          />
        </div>

        <div className="mx-auto max-w-screen-xl px-4 pb-16 sm:px-6 lg:px-8">
          <h2 className="heading-section text-gray900">
            Here&apos;s exactly how it works for your kitchen
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {forRestaurantsContent.kitchenFlow.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-gray100 bg-white p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-gray900">{item.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-gray700">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-screen-xl px-4 py-20 sm:px-6 lg:px-8">
          <h2 className="heading-section text-gray900">Operationally, this is how it runs</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {forRestaurantsContent.onboardingSteps.map((step) => (
              <article
                key={step.title}
                className="rounded-2xl border border-gray100 bg-cream p-6"
              >
                <h3 className="text-lg font-semibold text-gray900">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray700">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-forest-light">
        <div className="mx-auto max-w-screen-xl px-4 py-20 sm:px-6 lg:px-8">
          <h2 className="heading-section text-gray900">Simple, transparent pricing</h2>
          <div className="mt-6 overflow-hidden rounded-2xl border border-forest-light bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Partner pricing phases, commission rates, and operational notes.
              </caption>
              <thead className="bg-forest text-white">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Phase</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Commission</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {forRestaurantsContent.comparisonRows.map((row, index) => (
                  <tr key={row.phase} className={index % 2 === 0 ? 'bg-white' : 'bg-forest-light'}>
                    <th scope="row" className="px-4 py-4 text-left font-medium text-gray900">
                      {row.phase}
                    </th>
                    <td className="px-4 py-4 font-semibold text-forest">{row.commission}</td>
                    <td className="px-4 py-4 text-gray700">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="bg-cream">
        <div className="mx-auto max-w-screen-xl px-4 py-20 sm:px-6 lg:px-8">
          <h2 className="heading-section text-gray900">Operational clarity for serious operators</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {forRestaurantsContent.operationalNotes.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-gray100 bg-white p-6 shadow-[0_10px_30px_rgba(26,92,56,0.08)]"
              >
                <h3 className="text-lg font-semibold text-gray900">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray700">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-screen-xl px-4 py-20 sm:px-6 lg:px-8">
          <h2 className="heading-section text-gray900">Why goZaika is different</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {forRestaurantsContent.differentiators.map((item, index) => {
              const Icon = differentiatorIcons[index] ?? ShieldCheck;

              return (
                <div
                  key={item.title}
                  className="rounded-xl border border-forest-light bg-white p-6"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-saffron-light text-forest">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray900">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray700">{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-cream">
        <div className="mx-auto grid max-w-screen-xl gap-8 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="space-y-4">
            <h2 className="heading-section text-gray900">Ready to become a goZaika partner?</h2>
            <p className="text-base text-gray700">
              Share your details and our team will connect with you within 48 hours.
            </p>
            <div className="rounded-2xl bg-white p-6">
              <h3 className="text-lg font-semibold text-gray900">Operational FAQ</h3>
              <div className="mt-4 space-y-4">
                {forRestaurantsContent.operationalFaqs.map((faq) => (
                  <article key={faq.question}>
                    <p className="font-semibold text-gray900">{faq.question}</p>
                    <p className="mt-1 text-sm leading-relaxed text-gray700">{faq.answer}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-8 shadow-[0_10px_40px_rgba(26,92,56,0.1)]">
            <PartnerInterestForm />
          </div>
        </div>
      </section>
    </>
  );
}
