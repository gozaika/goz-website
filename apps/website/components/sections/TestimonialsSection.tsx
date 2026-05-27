/**
 * @file apps/website/components/sections/TestimonialsSection.tsx
 * @description Pilot-era testimonials section.
 * Three cards with curated pilot quotes. Swap quote text with real verbatims post-pilot.
 * Keep card structure and layout — only the quote + attribution changes.
 */

import * as React from 'react';

import { SectionIntro } from '@/components/ui/SectionIntro';
import { Reveal } from '@/components/ui/Reveal';

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  area: string;
  initials: string;
}

/**
 * PILOT NOTE: Replace these with verbatim quotes from real pilot users.
 * Keep the structure. The card design and layout are production-ready.
 */
const testimonials: ReadonlyArray<Testimonial> = [
  {
    quote:
      "I work in HITEC City and I am always looking for something better than another aggregator order. The first bag I claimed from a Jubilee Hills kitchen was genuinely one of the best meals I'd had all month — and I had no idea what was inside until pickup.",
    name: 'Arjun S.',
    role: 'Product Manager',
    area: 'HITEC City',
    initials: 'AS',
  },
  {
    quote:
      "We'd never have reached this kind of food-curious audience through delivery. goZaika brought people who were genuinely interested in what we do — not just the cheapest option in their area. Three of them have since become regulars.",
    name: 'Chef Priya K.',
    role: 'Restaurant Partner',
    area: 'Banjara Hills',
    initials: 'PK',
  },
  {
    quote:
      "The allergen disclosure before purchase was what convinced me to try it. I have a nut allergy and I usually skip anything 'mystery'. But seeing every single allergen listed before I paid — that trust is rare in the food space.",
    name: 'Meera T.',
    role: 'UX Designer',
    area: 'Kondapur',
    initials: 'MT',
  },
];

export function TestimonialsSection(): React.ReactElement {
  return (
    <section className="bg-cream" aria-labelledby="testimonials-heading">
      <div className="mx-auto max-w-screen-xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionIntro
          eyebrow="EARLY VOICES"
          title="What the first wave is saying."
          body="From pilot testers and founding restaurant partners — early reactions to the goZaika experience."
          centered
        />

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Reveal
              as="article"
              key={testimonial.name}
              className="premium-card premium-card-hover flex flex-col rounded-2xl bg-white p-6"
              amount={0.12}
              delayClass={
                index === 1 ? 'reveal-delay-100' : index === 2 ? 'reveal-delay-160' : undefined
              }
            >
              <QuoteIcon />
              <blockquote className="mt-4 flex-1">
                <p className="text-sm leading-relaxed text-gray700 italic">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
              </blockquote>
              <footer className="mt-6 flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-saffron text-sm font-bold text-gray900"
                  aria-hidden="true"
                >
                  {testimonial.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray900">{testimonial.name}</p>
                  <p className="text-xs text-gray500">
                    {testimonial.role} · {testimonial.area}
                  </p>
                </div>
              </footer>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuoteIcon(): React.ReactElement {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 24"
      fill="none"
      className="h-6 w-8 shrink-0 text-saffron"
    >
      <path
        d="M0 24V14.4C0 10.24 1.04 6.853 3.12 4.24 5.2 1.627 8.107 0 11.84 0L13.44 2.88C11.307 3.413 9.6 4.64 8.32 6.56 7.04 8.427 6.4 10.453 6.4 12.64H12.8V24H0ZM19.2 24V14.4c0-4.16 1.04-7.547 3.12-10.16C24.4 1.627 27.307 0 31.04 0L32.64 2.88c-2.133.533-3.84 1.76-5.12 3.68-1.28 1.867-1.92 3.893-1.92 6.08H32V24H19.2Z"
        fill="currentColor"
        opacity="0.4"
      />
    </svg>
  );
}
