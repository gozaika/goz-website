'use client';

import Image from 'next/image';
import Link from 'next/link';

import { Reveal } from '@/components/ui/Reveal';

interface RestaurantStat {
  value: string;
  label: string;
}

interface RestaurantTeaserSectionProps {
  eyebrow: string;
  heading: string;
  body: string;
  stats: ReadonlyArray<RestaurantStat>;
  cta: string;
}

export function RestaurantTeaserSection({
  body,
  cta,
  eyebrow,
  heading,
  stats,
}: RestaurantTeaserSectionProps): React.ReactElement {
  return (
    <section id="partners" className="bg-forest">
      <div className="mx-auto grid max-w-screen-xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
        <div className="text-white">
          <span className="mb-6 inline-block rounded-full bg-saffron px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-gray900">
            {eyebrow}
          </span>
          <h2 className="heading-section mb-4 text-white">{heading}</h2>
          <p className="mb-10 max-w-md text-lg text-forest-light">{body}</p>

          <div className="mb-10 grid grid-cols-3 gap-6">
            {stats.map((stat, index) => {
              const delayClass =
                index === 1 ? 'reveal-delay-80' : index === 2 ? 'reveal-delay-160' : undefined;

              return (
                <Reveal
                  as="div"
                  key={stat.label}
                  amount={0.2}
                  delayClass={delayClass}
                >
                <p className="text-2xl font-bold text-cream">{stat.value}</p>
                <p className="text-xs text-forest-light">{stat.label}</p>
                </Reveal>
              );
            })}
          </div>

          <Link
            href="/for-restaurants"
            className="inline-block rounded-md bg-saffron px-8 py-3 text-sm font-semibold text-gray900 transition-colors hover:bg-[var(--color-saffron-hover)]"
          >
            {cta}
          </Link>
        </div>

        <div className="flex items-center justify-center rounded-3xl bg-white/6 p-4">
          <Image
            src="/images/restaurant-hero-v2.svg"
            alt="Illustration for restaurant partners"
            width={760}
            height={580}
            className="h-auto w-full max-w-xl rounded-2xl"
          />
        </div>
      </div>
    </section>
  );
}
