import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { PackageCheck, Percent, ShieldCheck } from 'lucide-react';

import { PartnerInterestForm } from '@/components/forms/PartnerInterestForm';
import { Reveal } from '@/components/ui/Reveal';
import { SectionIntro } from '@/components/ui/SectionIntro';
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
            <SectionIntro
              titleAs="h1"
              title={forRestaurantsContent.title}
              body={forRestaurantsContent.subtitle}
              className="max-w-3xl"
            />
            <Link
              href="#partner-form"
              className="mt-8 inline-flex h-12 items-center justify-center rounded-md bg-saffron px-6 text-base font-semibold text-gray900 transition-colors hover:bg-[var(--color-saffron-hover)]"
            >
              Express Partner Interest
            </Link>
          </div>
          <Reveal as="div" className="reveal-media premium-card rounded-3xl bg-white p-4" amount={0.15} delayClass="reveal-delay-160">
            <Image
              src="/images/restaurant-hero-v2.svg"
              alt="Restaurant partner growth illustration"
              width={800}
              height={600}
              className="h-auto w-full rounded-3xl transition-transform duration-300 hover:scale-[1.01]"
              priority
            />
          </Reveal>
        </div>

        <div className="mx-auto max-w-screen-xl px-4 pb-16 sm:px-6 lg:px-8">
          <SectionIntro title="Here's exactly how it works for your kitchen" />
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {forRestaurantsContent.kitchenFlow.map((item, index) => (
              <Reveal
                as="div"
                key={item.title}
                className="premium-card premium-card-hover rounded-2xl bg-white p-6"
                amount={0.12}
                delayClass={index > 0 ? 'reveal-delay-100' : undefined}
              >
                <h3 className="text-lg font-semibold text-gray900">{item.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-gray700">{item.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-screen-xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionIntro title="Operationally, this is how it runs" />
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {forRestaurantsContent.onboardingSteps.map((step, index) => (
              <Reveal
                as="article"
                key={step.title}
                className="premium-card premium-card-hover rounded-2xl bg-cream p-6"
                amount={0.12}
                delayClass={index > 0 ? 'reveal-delay-100' : undefined}
              >
                <h3 className="text-lg font-semibold text-gray900">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray700">{step.body}</p>
              </Reveal>
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
          <SectionIntro title="Operational clarity for serious operators" />
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {forRestaurantsContent.operationalNotes.map((item, index) => (
              <Reveal
                as="article"
                key={item.title}
                className="premium-card premium-card-hover rounded-2xl bg-white p-6"
                amount={0.12}
                delayClass={index % 3 === 1 ? 'reveal-delay-80' : index % 3 === 2 ? 'reveal-delay-160' : undefined}
              >
                <h3 className="text-lg font-semibold text-gray900">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray700">{item.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-screen-xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionIntro title="Why goZaika is different" />
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {forRestaurantsContent.differentiators.map((item, index) => {
              const Icon = differentiatorIcons[index] ?? ShieldCheck;

              return (
                <Reveal
                  as="div"
                  key={item.title}
                  className="premium-card premium-card-hover rounded-xl border border-forest-light bg-white p-6"
                  amount={0.12}
                  delayClass={index > 0 ? 'reveal-delay-100' : undefined}
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-saffron-light text-forest">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray900">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray700">{item.body}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-cream">
        <div className="mx-auto grid max-w-screen-xl gap-8 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="space-y-4">
            <SectionIntro
              title="Ready to become a goZaika partner?"
              body="Share your details and our team will connect with you within 48 hours."
            />
            <div className="premium-card rounded-2xl bg-white p-6">
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
          <Reveal as="div" className="premium-card rounded-2xl bg-white p-8" amount={0.16}>
            <PartnerInterestForm />
          </Reveal>
        </div>
      </section>
    </>
  );
}
