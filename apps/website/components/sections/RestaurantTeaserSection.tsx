import Image from 'next/image';
import Link from 'next/link';

import { SectionIntro } from '@/components/ui/SectionIntro';

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
          <SectionIntro
            eyebrow={eyebrow}
            title={heading}
            body={body}
            invert
            className="max-w-md"
          />

          <div className="mb-10 grid grid-cols-3 gap-6">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="premium-card premium-card-hover rounded-2xl bg-white/5 p-4 backdrop-blur-[2px]"
            >
              <p className="text-2xl font-bold text-cream">{stat.value}</p>
              <p className="mt-1 text-xs text-forest-light">{stat.label}</p>
            </div>
          ))}
          </div>

          <Link
            href="/for-restaurants"
            className="inline-flex items-center rounded-md bg-saffron px-8 py-3 text-sm font-semibold text-gray900 transition-all hover:-translate-y-0.5 hover:bg-[var(--color-saffron-hover)]"
          >
            {cta}
          </Link>
        </div>

        <div className="premium-card rounded-3xl bg-white/6 p-4 backdrop-blur-sm">
          <Image
            src="/images/restaurant-hero-v2.svg"
            alt="Illustration for restaurant partners"
            width={760}
            height={580}
            className="h-auto w-full max-w-xl rounded-2xl transition-transform duration-300 hover:scale-[1.01]"
          />
        </div>
      </div>
    </section>
  );
}
