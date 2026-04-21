import type { Metadata } from 'next';

import { founderStory, leadershipRoles } from '@/lib/company';
import { canonical, openGraphFor, twitterFor } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Leadership | goZaika',
  description:
    'Founder context and the leadership bench goZaika is building around.',
  ...canonical('/company/leadership'),
  openGraph: openGraphFor(
    '/company/leadership',
    'Leadership | goZaika',
    'Founder context and the leadership bench goZaika is building around.',
  ),
  twitter: twitterFor(
    'Leadership | goZaika',
    'Founder context and the leadership bench goZaika is building around.',
  ),
};

export default function LeadershipPage(): React.ReactElement {
  return (
    <>
      <section className="bg-cream">
        <div className="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-forest">
            Leadership
          </p>
          <h1 className="heading-page mt-4 max-w-4xl text-gray900">
            Building a premium restaurant company with product discipline, not category noise.
          </h1>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-screen-xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div>
            <h2 className="heading-section text-gray900">{founderStory.heading}</h2>
            <div className="mt-5 space-y-4 text-base leading-relaxed text-gray700">
              {founderStory.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>





          <div className="rounded-3xl bg-forest p-8 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-forest-light">
            Why building this well matters
            </p>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-white/90">
            <p>
              goZaika is not just another food platform. It is trying to build something more delicate:
              trust between great restaurants and new diners, surprise without compromise, and wider
              access without loss of quality or dignity.
            </p>
            <p>
              That kind of idea cannot be built casually. It needs product discipline, operational care,
              and a long-term commitment to getting the details right.
            </p>
            <p>
              The goal is not to sound ambitious. The goal is to build something worthy of the culture it
              hopes to serve.
            </p>

            </div>
          </div>
        </div>
      </section>

      <section className="bg-cream">
        <div className="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="heading-section text-gray900">Leadership bench</h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray700">
            These are the core leadership mandates goZaika is building around as the company grows.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {leadershipRoles.map((role) => (
              <article
                key={role.title}
                className="rounded-2xl border border-gray100 bg-white p-6 shadow-[0_10px_30px_rgba(26,92,56,0.08)]"
              >
                <h3 className="text-lg font-semibold text-gray900">{role.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray700">{role.summary}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
