import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle, MessageCircle, PackageCheck, ShieldCheck, Users } from 'lucide-react';

import { RestaurantEconomicsCalculator } from '@/components/calculator/RestaurantEconomicsCalculator';
import { PartnerInterestForm } from '@/components/forms/PartnerInterestForm';
import { Reveal } from '@/components/ui/Reveal';
import { SectionIntro } from '@/components/ui/SectionIntro';
import { forRestaurantsContent } from '@/lib/content';
import { canonical, openGraphFor, twitterFor } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Partner With goZaika | For Restaurants',
  description:
    'A customer-acquisition channel for planned, chef-curated restaurant pickup drops: lean pilot commission, no delivery riders, and no upfront ad spend.',
  ...canonical('/for-restaurants'),
  openGraph: openGraphFor(
    '/for-restaurants',
    'Partner With goZaika',
    'Create pickup demand, protect margin, and preserve your brand.',
    '/images/social/og-home-v3.png',
  ),
  twitter: twitterFor(
    'Partner With goZaika',
    'Create pickup demand, protect margin, and preserve your brand.',
    '/images/social/og-home-v3.png',
  ),
};

export default function ForRestaurantsPage(): React.ReactElement {
  const differentiatorIcons = [ShieldCheck, Users, PackageCheck] as const;

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
              src="/images/restaurant-hero-v3.webp"
              alt="A branded goZaika BAM Bag ready for pickup from a premium restaurant kitchen"
              width={1536}
              height={1024}
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

      <section className="bg-forest-light">
        <div className="mx-auto max-w-screen-xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionIntro
            eyebrow={forRestaurantsContent.fillSpectrum.eyebrow}
            title={forRestaurantsContent.fillSpectrum.heading}
            body={forRestaurantsContent.fillSpectrum.body}
            className="max-w-3xl"
          />
          <div className="premium-card mt-10 rounded-3xl bg-white p-8">
            <div
              className="h-3 w-full rounded-full"
              style={{
                background:
                  'linear-gradient(90deg, var(--color-forest) 0%, var(--color-gold) 55%, var(--color-saffron) 100%)',
              }}
              aria-hidden="true"
            />
            <div className="mt-6 grid gap-6 sm:grid-cols-3">
              {forRestaurantsContent.fillSpectrum.spectrum.map((item) => (
                <div key={item.label}>
                  <p className="text-base font-semibold text-gray900">{item.label}</p>
                  <p className="mt-1 text-sm leading-relaxed text-gray600">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="calculator" className="bg-white">
        <div className="mx-auto max-w-screen-xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionIntro
            eyebrow={forRestaurantsContent.calculator.eyebrow}
            title={forRestaurantsContent.calculator.heading}
            body={forRestaurantsContent.calculator.body}
            className="max-w-3xl"
          />
          <div className="mt-10">
            <RestaurantEconomicsCalculator disclaimer={forRestaurantsContent.calculator.disclaimer} />
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

      <section className="bg-white">
        <div className="mx-auto max-w-screen-xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionIntro title="How goZaika protects your brand" />
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {forRestaurantsContent.brandProtection.map((item, index) => (
              <Reveal
                as="article"
                key={item}
                className="premium-card premium-card-hover rounded-r-2xl border-l-4 border-forest bg-cream p-6"
                amount={0.12}
                delayClass={index % 2 === 1 ? 'reveal-delay-100' : undefined}
              >
                <p className="text-base leading-relaxed text-gray700">{item}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Cannibalization assurance */}
      <section className="bg-forest text-white" aria-labelledby="cannibalization-heading">
        <div className="mx-auto max-w-screen-xl px-4 py-20 sm:px-6 lg:grid lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-saffron-light">
              A COMMON QUESTION
            </p>
            <h2
              id="cannibalization-heading"
              className="font-playfair text-3xl font-bold text-white sm:text-4xl"
            >
              {forRestaurantsContent.cannibalizationAssurance.heading}
            </h2>
            <p className="mt-6 text-base leading-relaxed text-forest-light/90">
              {forRestaurantsContent.cannibalizationAssurance.body}
            </p>
          </div>
          <ul className="mt-10 space-y-4 lg:mt-0">
            {forRestaurantsContent.cannibalizationAssurance.points.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <CheckCircle
                  className="mt-0.5 h-5 w-5 shrink-0 text-whatsapp-brand"
                  aria-hidden="true"
                />
                <span className="text-base text-forest-light/90">{point}</span>
              </li>
            ))}
          </ul>
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

      {/* WhatsApp partner onboarding band */}
      <section className="bg-saffron-light border-y border-saffron/20">
        <div className="mx-auto flex max-w-screen-xl flex-col items-center gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:justify-between lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-forest">
              PREFER TO START ON WHATSAPP?
            </p>
            <p className="mt-1 text-base text-gray700">
              Message us <strong>PARTNER</strong> on WhatsApp and our team will walk you through onboarding in a conversation.
            </p>
          </div>
          <Link
            href="/insider"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-whatsapp px-7 py-3.5 text-sm font-semibold text-white shadow transition-all hover:bg-whatsapp-hover hover:shadow-md"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Message us on WhatsApp
          </Link>
        </div>
      </section>

      <section id="partner-form" className="bg-cream">
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
