import type { Metadata } from 'next';
import Link from 'next/link';

import { investorNarrative } from '@/lib/company';
import { canonical, openGraphFor, twitterFor } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Investors | goZaika',
  description:
    'Market thesis, why Hyderabad first, and investor context for goZaika.',
  ...canonical('/company/investors'),
  openGraph: openGraphFor(
    '/company/investors',
    'Investors | goZaika',
    'Market thesis, why Hyderabad first, and investor context for goZaika.',
  ),
  twitter: twitterFor(
    'Investors | goZaika',
    'Market thesis, why Hyderabad first, and investor context for goZaika.',
  ),
};

export default function InvestorsPage(): React.ReactElement {
  return (
    <>
      <section className="bg-cream">
        <div className="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-forest">
            Investors
          </p>
          <h1 className="heading-page mt-4 max-w-4xl text-gray900">
            A category thesis built around premium restaurant demand that does not depend on discounting.
          </h1>
          <p className="text-lead mt-4 max-w-3xl text-gray700">{investorNarrative.thesis}</p>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-screen-xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="heading-section text-gray900">Why this matters now</h2>
            <div className="mt-5 space-y-4 text-base leading-relaxed text-gray700">
              <p>
                India’s premium restaurant market has strong supply, but weak brand-safe customer
                acquisition channels. Current digital products solve convenience and discount-led
                volume well. They do not solve controlled discovery for operators who care about
                perception, quality, and repeat intent.
              </p>
              <p>
                goZaika is designed around that gap. The product asks whether demand can be shaped
                through trust, disclosure, and curation rather than through price compression. That
                is the category question. Hyderabad is the proving ground.
              </p>
            </div>
          </div>

          <div className="rounded-3xl bg-forest p-8 text-white">
            <h2 className="heading-section text-white">Core investor points</h2>
            <ul className="mt-5 space-y-4 text-sm leading-relaxed text-white/90">
              {investorNarrative.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-cream">
        <div className="mx-auto grid max-w-screen-xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-3 lg:px-8">
          <article className="rounded-2xl bg-white p-6 shadow-[0_10px_30px_rgba(26,92,56,0.08)]">
            <h3 className="text-lg font-semibold text-gray900">What we can share</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray700">
              Company narrative, market thesis, product framing, city sequencing logic, and the
              operating assumptions behind a pickup-first demand layer.
            </p>
          </article>
          <article className="rounded-2xl bg-white p-6 shadow-[0_10px_30px_rgba(26,92,56,0.08)]">
            <h3 className="text-lg font-semibold text-gray900">What we do not fake</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray700">
              No fabricated waitlist counts, no placeholder testimonials, and no artificial national
              expansion story. We would rather be precise than cosmetically impressive.
            </p>
          </article>
          <article className="rounded-2xl bg-white p-6 shadow-[0_10px_30px_rgba(26,92,56,0.08)]">
            <h3 className="text-lg font-semibold text-gray900">How to request materials</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray700">
              Email <strong>hello@gozaika.in</strong> with the subject line “Investor Enquiry”.
              We will share a one-pager or deck in the context of a serious conversation.
            </p>
          </article>
        </div>

        <div className="mx-auto max-w-screen-xl px-4 pb-16 sm:px-6 lg:px-8">
          <Link
            href="/contact"
            className="inline-flex h-12 items-center justify-center rounded-md bg-saffron px-6 text-base font-semibold text-gray900 transition-colors hover:bg-[var(--color-saffron-hover)]"
          >
            Start an investor conversation
          </Link>
        </div>
      </section>
    </>
  );
}
