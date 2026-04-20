import type { Metadata } from 'next';

import { CareerApplicationForm } from '@/components/forms/CareerApplicationForm';
import { careerTracks } from '@/lib/company';
import { canonical, openGraphFor, twitterFor } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Careers | goZaika',
  description:
    'Join goZaika and help build the trust layer for premium restaurant discovery.',
  ...canonical('/company/careers'),
  openGraph: openGraphFor(
    '/company/careers',
    'Careers | goZaika',
    'Join goZaika and help build the trust layer for premium restaurant discovery.',
  ),
  twitter: twitterFor(
    'Careers | goZaika',
    'Join goZaika and help build the trust layer for premium restaurant discovery.',
  ),
};

export default function CareersPage(): React.ReactElement {
  return (
    <>
      <section className="bg-cream">
        <div className="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-forest">
            Careers
          </p>
          <h1 className="heading-page mt-4 max-w-4xl text-gray900">
            Build the operating system behind premium restaurant discovery.
          </h1>
          <p className="text-lead mt-4 max-w-3xl text-gray700">
            We are early, focused, and building with intention. If you care about product rigor,
            operator empathy, and category design, we want to hear from you.
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-screen-xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="heading-section text-gray900">Why join now</h2>
            <div className="mt-5 space-y-4 text-base leading-relaxed text-gray700">
              <p>
                goZaika is at the point where category framing, product detail, and city-level
                execution still sit close together. That makes this a rare chance to shape the
                product and the company at the same time.
              </p>
              <p>
                We are not building another generic food app. We are building a trust-sensitive
                marketplace for premium restaurants and thoughtful diners. The work rewards people
                who can think precisely, execute cleanly, and care about both customer experience
                and operator reality.
              </p>
            </div>

            <div className="mt-8 space-y-4">
              {careerTracks.map((track) => (
                <article
                  key={track.title}
                  className="rounded-2xl border border-gray100 bg-cream p-5"
                >
                  <h3 className="text-lg font-semibold text-gray900">{track.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray700">{track.body}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-[0_10px_40px_rgba(26,92,56,0.1)]">
            <h2 className="heading-section text-gray900">Apply here</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray700">
              We are especially interested in people who can bring product judgment, market
              clarity, and operational depth to an early-stage hospitality platform.
            </p>
            <div className="mt-6">
              <CareerApplicationForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
