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
  const mainlandPath =
    'M198 34 216 26 236 34 248 48 266 50 281 63 292 84 286 102 271 111 262 128 278 149 276 171 255 180 242 194 232 214 236 236 224 256 207 273 193 301 177 318 161 332 139 354 132 377 111 388 100 409 110 428 126 441 132 462 145 486 162 508 177 535 188 565 198 590 208 619 221 630 235 617 246 589 258 566 268 538 275 508 285 484 296 458 307 432 321 410 333 386 342 358 344 334 337 313 331 292 333 272 345 255 350 232 361 217 379 203 390 183 382 164 365 161 352 150 333 151 319 168 303 185 289 192 280 176 261 165 250 148 245 128 231 112 213 98 200 80 186 62 188 46Z';
  const northEastPath =
    'M322 176 339 164 360 161 378 166 394 160 403 172 397 188 381 198 364 205 345 206 328 198 319 186Z';

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
              <div className="absolute right-4 top-4 z-20 rounded-2xl border border-gray100 bg-white/92 p-3 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray600">
                  Legend
                </p>
                <div className="mt-3 space-y-2">
                  {cityTierOrder.map((tier) => {
                    const tone = tierTone[tier];

                    return (
                      <div key={tier} className="flex items-center gap-2 text-xs text-gray700">
                        <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
                        <span>{tier}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <svg
                viewBox="0 0 420 640"
                className="absolute inset-0 h-full w-full"
                aria-hidden="true"
              >
                <defs>
                  <clipPath id="india-map-clip">
                    <path d={mainlandPath} />
                    <path d={northEastPath} />
                  </clipPath>
                </defs>

                <path
                  d={mainlandPath}
                  fill="rgb(234 243 222 / 0.74)"
                  stroke="rgb(26 92 56 / 0.32)"
                  strokeWidth="5"
                  strokeLinejoin="round"
                />
                <path
                  d={northEastPath}
                  fill="rgb(234 243 222 / 0.74)"
                  stroke="rgb(26 92 56 / 0.32)"
                  strokeWidth="5"
                  strokeLinejoin="round"
                />

                <g clipPath="url(#india-map-clip)">
                  {cityLaunchTiers.map((city) => {
                    const tone = tierTone[city.tier];
                    const x = (Number.parseFloat(city.left) / 100) * 420;
                    const y = (Number.parseFloat(city.top) / 100) * 640;

                    return (
                      <g key={`${city.city}-marker`}>
                        <circle cx={x} cy={y} r="18" className={tone.ring} opacity="0.9" />
                        <circle
                          cx={x}
                          cy={y}
                          r="18"
                          className={`${tone.ring} origin-center animate-ping`}
                          opacity="0.55"
                        />
                        <circle
                          cx={x}
                          cy={y}
                          r="7"
                          className={tone.dot}
                          stroke="white"
                          strokeWidth="3"
                        />
                      </g>
                    );
                  })}
                </g>

                {cityLaunchTiers.map((city) => {
                  const x = (Number.parseFloat(city.left) / 100) * 420;
                  const y = (Number.parseFloat(city.top) / 100) * 640;
                  const labelWidth = Math.max(52, city.city.length * 8.4);

                  return (
                    <g key={`${city.city}-label`}>
                      <rect
                        x={x + 12}
                        y={y - 12}
                        width={labelWidth}
                        height="24"
                        rx="12"
                        fill="white"
                        opacity="0.94"
                        stroke="rgb(229 231 235)"
                      />
                      <text
                        x={x + 22}
                        y={y + 4}
                        fontSize="12"
                        fontWeight="600"
                        fill="rgb(17 24 39)"
                      >
                        {city.city}
                      </text>
                    </g>
                  );
                })}
              </svg>
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
