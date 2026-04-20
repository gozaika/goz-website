import type { Metadata } from 'next';

import { culturePrinciples } from '@/lib/company';
import { canonical, openGraphFor, twitterFor } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Culture | goZaika',
  description:
    'How goZaika works, how decisions are made, and what kind of team the company is building.',
  ...canonical('/company/culture'),
  openGraph: openGraphFor(
    '/company/culture',
    'Culture | goZaika',
    'How goZaika works, how decisions are made, and what kind of team the company is building.',
  ),
  twitter: twitterFor(
    'Culture | goZaika',
    'How goZaika works, how decisions are made, and what kind of team the company is building.',
  ),
};

export default function CulturePage(): React.ReactElement {
  return (
    <>
      <section className="bg-cream">
        <div className="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-forest">
            Culture
          </p>
          <h1 className="heading-page mt-4 max-w-4xl text-gray900">
            A company culture shaped by product rigor and hospitality empathy.
          </h1>
          <p className="text-lead mt-4 max-w-3xl text-gray700">
            We are building goZaika as a disciplined operating company, not a startup that hides
            weak fundamentals behind noise. That means clear priorities, respect for operators, and
            an unusual amount of care for trust details.
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-screen-xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="rounded-3xl bg-forest p-8 text-white">
            <h2 className="heading-section text-white">How we work</h2>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-white/90">
              <p>
                We prefer clear thinking over internal theatre, real progress over roadmap
                ornamentation, and product truth over category mimicry.
              </p>
              <p>
                The team is expected to understand both sides of the market: diners who need trust
                before payment, and restaurant teams who have spent years building reputation.
              </p>
              <p>
                We believe city-first execution creates better companies than expansion-by-slide
                deck. If we cannot make the product work deeply in Hyderabad, we have not earned the
                right to talk about scale.
              </p>
            </div>
          </div>

          <div className="rounded-3xl bg-cream p-8">
            <h2 className="heading-section text-gray900">What good judgment looks like</h2>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-gray700">
              <p>Choosing precision over hype when the market rewards exaggeration.</p>
              <p>Designing for the kitchen, not just for the interface screenshot.</p>
              <p>Writing copy that respects both the diner and the operator.</p>
              <p>Measuring what compounds trust, not just what spikes traffic.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-cream">
        <div className="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="heading-section text-gray900">Our operating principles</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {culturePrinciples.map((principle) => (
              <article
                key={principle.title}
                className="rounded-2xl border border-gray100 bg-white p-6 shadow-[0_10px_30px_rgba(26,92,56,0.08)]"
              >
                <h3 className="text-lg font-semibold text-gray900">{principle.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray700">{principle.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
