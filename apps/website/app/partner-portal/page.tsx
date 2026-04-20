import type { Metadata } from 'next';
import Link from 'next/link';
import { Megaphone, Users, UtensilsCrossed, Workflow, BriefcaseBusiness } from 'lucide-react';

import { canonical, openGraphFor, twitterFor } from '@/lib/metadata';

const partnerCategories = [
  {
    title: 'PR and communications partners',
    body: 'For firms, writers, and storytellers who can help shape category language, launch narratives, and founder visibility without reducing goZaika to another discount food app.',
    icon: Megaphone,
  },
  {
    title: 'Local communities',
    body: 'For residential communities, tastemaker groups, and premium neighborhood networks that can help seed early demand with the right audience.',
    icon: Users,
  },
  {
    title: 'Hospitality groups',
    body: 'For restaurant groups, hotel kitchens, chef-led collectives, and operating partners who understand premium food as a brand, not just inventory.',
    icon: UtensilsCrossed,
  },
  {
    title: 'Ecosystem partners',
    body: 'For reservation, POS, loyalty, payments, packaging, analytics, and compliance collaborators who can strengthen the operating system around the platform.',
    icon: Workflow,
  },
  {
    title: 'Strategic and capital partners',
    body: 'For investors and advisors who understand trust-led marketplace design, hospitality infrastructure, and the discipline required to build city by city.',
    icon: BriefcaseBusiness,
  },
] as const;

const collaborationExamples = [
  'Launch a city-level storytelling programme with premium neighborhood communities.',
  'Run operator roundtables with restaurant groups on acquisition without discounting.',
  'Build partner enablement with hospitality-tech tools that support smoother kitchen operations.',
  'Coordinate investor and strategic conversations around the Hyderabad-first market thesis.',
] as const;

export const metadata: Metadata = {
  title: 'Partner Portal | goZaika',
  description:
    'Partnership opportunities for hospitality groups, ecosystem collaborators, and strategic allies.',
  ...canonical('/partner-portal'),
  openGraph: openGraphFor(
    '/partner-portal',
    'Partner Portal | goZaika',
    'Partnership opportunities for hospitality groups, ecosystem collaborators, and strategic allies.',
  ),
  twitter: twitterFor(
    'Partner Portal | goZaika',
    'Partnership opportunities for hospitality groups, ecosystem collaborators, and strategic allies.',
  ),
};

export default function PartnerPortalPage(): React.ReactElement {
  return (
    <>
      <section className="bg-cream">
        <div className="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-forest">
            Partner Portal
          </p>
          <h1 className="heading-page mt-4 max-w-4xl text-gray900">
            Not every goZaika partner is a restaurant.
          </h1>
          <p className="text-lead mt-4 max-w-3xl text-gray700">
            We are building a premium discovery platform for restaurants, but the ecosystem around
            that work is broader: hospitality groups, media partners, local communities,
            infrastructure collaborators, and investors who understand why brand-safe growth matters.
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {partnerCategories.map((category) => {
              const Icon = category.icon;

              return (
                <article
                  key={category.title}
                  className="rounded-2xl border border-gray100 bg-white p-6 shadow-[0_10px_30px_rgba(26,92,56,0.08)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-saffron-light text-forest">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h2 className="mt-5 text-xl font-semibold text-gray900">{category.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-gray700">{category.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-forest-light">
        <div className="mx-auto grid max-w-screen-xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="heading-section text-gray900">Why collaborate with goZaika?</h2>
            <div className="mt-5 space-y-4 text-base leading-relaxed text-gray700">
              <p>
                goZaika is building a new demand layer for premium restaurants in India. That means
                the company needs more than supply and customer acquisition. It needs market
                language, local density, operating leverage, and category-shaping allies.
              </p>
              <p>
                The work is intentionally focused: Hyderabad first, pickup-first, trust-led, and
                brand-aware. That discipline makes us a better partner for operators, communities,
                and ecosystem collaborators who want to build something durable rather than noisy.
              </p>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-8">
            <h3 className="text-lg font-semibold text-gray900">What a partnership can look like</h3>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-gray700">
              {collaborationExamples.map((item) => (
                <li key={item} className="rounded-xl border border-gray100 bg-cream p-4">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-screen-xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="rounded-3xl border border-gray100 bg-white p-8 shadow-[0_10px_30px_rgba(26,92,56,0.08)]">
            <h2 className="heading-section text-gray900">Signals serious partners expect</h2>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-gray700">
              <li>Company background with a clear Hyderabad-first market thesis.</li>
              <li>Leadership context and founder credibility grounded in real execution history.</li>
              <li>Partnership categories and examples, not just a generic “contact us” form.</li>
              <li>Access to a one-pager or deck request path for deeper conversations.</li>
              <li>Corporate contact routes for partnerships, press, and investor diligence.</li>
            </ul>
          </div>

          <div className="rounded-3xl bg-cream p-8">
            <h2 className="heading-section text-gray900">Start the conversation</h2>
            <div className="mt-5 space-y-3 text-sm leading-relaxed text-gray700">
              <p>
                Partnership enquiries: <strong>partners@gozaika.in</strong>
              </p>
              <p>
                Investor and strategic conversations: <strong>hello@gozaika.in</strong>
              </p>
              <p>
                Company: <strong>goZaika Technologies Pvt. Ltd.</strong>
              </p>
              <p>
                Operating base: <strong>Hyderabad</strong>
              </p>
              <p>
                Registered office details and formal diligence materials are shared directly during
                serious partner and investor conversations.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="inline-flex h-12 items-center justify-center rounded-md bg-saffron px-6 text-base font-semibold text-gray900 transition-colors hover:bg-[var(--color-saffron-hover)]"
              >
                Contact the team
              </Link>
              <Link
                href="/company/investors"
                className="inline-flex h-12 items-center justify-center rounded-md border border-forest px-6 text-base font-semibold text-forest transition-colors hover:bg-forest hover:text-white"
              >
                View investor context
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
