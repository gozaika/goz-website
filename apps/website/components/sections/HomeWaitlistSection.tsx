'use client';

import { WaitlistForm } from '@/components/forms/WaitlistForm';
import { Reveal } from '@/components/ui/Reveal';
import { SectionIntro } from '@/components/ui/SectionIntro';

interface PreviewRestaurant {
  name: string;
  cuisine: string;
  area: string;
  pickup: string;
  value: string;
}

interface HomeWaitlistSectionProps {
  heading: string;
  body: string;
  disclaimer: string;
  restaurants: ReadonlyArray<PreviewRestaurant>;
}

export function HomeWaitlistSection({
  body,
  disclaimer,
  heading,
  restaurants,
}: HomeWaitlistSectionProps): React.ReactElement {
  return (
    <section id="waitlist" className="bg-cream py-24">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <SectionIntro title={heading} body={body} centered className="mx-auto max-w-2xl" />

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {restaurants.map((restaurant, index) => (
            <Reveal
              as="div"
              key={restaurant.name}
              className="premium-card premium-card-hover relative overflow-hidden rounded-xl bg-white p-6"
              amount={0.15}
              delayClass={
                index === 1 ? 'reveal-delay-100' : index === 2 ? 'reveal-delay-200' : undefined
              }
            >
              <span className="absolute top-4 right-4 rounded-full bg-gray100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-gray700">
                Preview
              </span>
              <div className="mb-4 h-1 w-12 rounded-full bg-saffron" />
              <h3 className="text-base font-semibold text-gray900">{restaurant.name}</h3>
              <p className="mb-3 mt-1 text-sm text-gray500">
                {restaurant.cuisine} · {restaurant.area}
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray500">{restaurant.pickup}</span>
                <span className="font-semibold text-forest">{restaurant.value}</span>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal
          as="p"
          className="mt-6 text-center text-xs text-gray500"
          amount={0.15}
          delayClass="reveal-delay-200"
        >
          {disclaimer}
        </Reveal>

        <Reveal
          as="div"
          className="premium-card mx-auto mt-12 max-w-2xl rounded-2xl bg-white p-8 backdrop-blur-sm sm:p-12"
          amount={0.2}
        >
          <WaitlistForm />
        </Reveal>
      </div>
    </section>
  );
}
