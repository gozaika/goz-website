'use client';

import { WaitlistForm } from '@/components/forms/WaitlistForm';
import { Reveal } from '@/components/ui/Reveal';

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
  restaurants: ReadonlyArray<PreviewRestaurant>;
}

export function HomeWaitlistSection({
  body,
  heading,
  restaurants,
}: HomeWaitlistSectionProps): React.ReactElement {
  return (
    <section id="waitlist" className="bg-cream py-24">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="heading-section text-gray900">{heading}</h2>
          <p className="mt-4 text-base text-gray600">{body}</p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {restaurants.map((restaurant) => (
            <div
              key={restaurant.name}
              className="relative overflow-hidden rounded-xl border border-gray100 bg-white p-6 shadow-sm"
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
            </div>
          ))}
        </div>

        <Reveal
          as="div"
          className="mx-auto mt-12 max-w-2xl rounded-2xl bg-white p-8 shadow-[0_10px_40px_rgba(26,92,56,0.1)] sm:p-12"
          amount={0.2}
        >
          <WaitlistForm />
        </Reveal>
      </div>
    </section>
  );
}
