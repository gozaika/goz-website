import type { Metadata } from 'next';

import { cityLaunchTiers, cityTierOrder } from '@/lib/cities';
import { canonical, openGraphFor, twitterFor } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Cities | goZaika',
  description:
    'The goZaika launch map and market-expansion thesis across India.',
  ...canonical('/cities'),
  openGraph: openGraphFor(
    '/cities',
    'Cities | goZaika',
    'The goZaika launch map and market-expansion thesis across India.',
  ),
  twitter: twitterFor(
    'Cities | goZaika',
    'The goZaika launch map and market-expansion thesis across India.',
  ),
};

const tierTone = {
  Live: {
    dot: 'bg-saffron',
    ring: 'bg-saffron/30',
    pill: 'bg-saffron-light text-forest',
  },
  'Wave 2': {
    dot: 'bg-forest',
    ring: 'bg-forest/20',
    pill: 'bg-forest-light text-forest',
  },
  'Wave 3': {
    dot: 'bg-gray500',
    ring: 'bg-gray200',
    pill: 'bg-gray100 text-gray700',
  },
} as const;

export default function CitiesPage(): React.ReactElement {
  const orderedCities = [...cityLaunchTiers].sort(
    (left, right) => cityTierOrder.indexOf(left.tier) - cityTierOrder.indexOf(right.tier),
  );

  return (
    <>
      <section className="bg-cream">
        <div className="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-forest">
            Cities
          </p>
          <h1 className="heading-page mt-4 max-w-4xl text-gray900">
            Depth before breadth. Hyderabad first, expansion by proof.
          </h1>
          <p className="text-lead mt-4 max-w-3xl text-gray700">
            goZaika is not chasing geographic coverage. We are sequencing markets based on premium
            restaurant density, operating quality, and the likelihood of building repeat trust.
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-screen-xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div className="rounded-3xl border border-gray100 bg-cream p-6">
            <div className="relative h-[640px] overflow-hidden rounded-3xl bg-white">
              <svg
                viewBox="0 0 420 640"
                className="absolute inset-0 h-full w-full text-forest-light"
                aria-hidden="true"
              >
                <path
                  d="M212 30 246 62 273 116 318 150 311 196 334 236 320 292 338 336 305 388 282 438 252 486 256 548 220 594 190 560 176 500 138 470 120 420 88 388 70 330 84 286 62 240 76 190 110 154 122 102 160 74 182 34Z"
                  fill="currentColor"
                  opacity="0.7"
                />
              </svg>

              {cityLaunchTiers.map((city) => {
                const tone = tierTone[city.tier];

                return (
                  <div
                    key={city.city}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ top: city.top, left: city.left }}
                  >
                    <div className={`absolute inset-0 animate-ping rounded-full ${tone.ring}`} />
                    <div className={`relative h-4 w-4 rounded-full border-2 border-white ${tone.dot}`} />
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-white px-2 py-1 text-xs font-semibold text-gray900">
                      {city.city}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="heading-section text-gray900">Launch sequencing</h2>
            <div className="mt-6 space-y-4">
              {orderedCities.map((city) => {
                const tone = tierTone[city.tier];

                return (
                  <article
                    key={city.city}
                    className="rounded-2xl border border-gray100 bg-white p-5 shadow-[0_10px_24px_rgba(26,92,56,0.06)]"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone.pill}`}>
                        {city.tier}
                      </span>
                      <h3 className="text-lg font-semibold text-gray900">
                        {city.city}, {city.state}
                      </h3>
                    </div>
                    <p className="mt-2 text-sm font-medium text-gray700">{city.focusZones}</p>
                    <p className="mt-3 text-sm leading-relaxed text-gray600">{city.rationale}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
