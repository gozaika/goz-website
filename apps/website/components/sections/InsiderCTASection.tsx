/**
 * @file apps/website/components/sections/InsiderCTASection.tsx
 * @description Full-width WhatsApp Insider CTA band on the homepage.
 * Links to /insider for the full sign-up flow.
 */

import * as React from 'react';

import Link from 'next/link';
import { MessageCircle } from 'lucide-react';

import { homeContent } from '@/lib/content';

export function InsiderCTASection(): React.ReactElement {
  const { insiderBand } = homeContent;

  return (
    <section
      className="relative overflow-hidden bg-forest"
      aria-labelledby="insider-band-heading"
    >
      {/* ambient background glow */}
      <div
        className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-saffron/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-gold/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-8 text-center lg:flex-row lg:justify-between lg:text-left">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-saffron-light">
              {insiderBand.eyebrow}
            </p>
            <h2
              id="insider-band-heading"
              className="font-playfair text-3xl font-bold text-white sm:text-4xl"
            >
              {insiderBand.heading}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-forest-light/90">
              {insiderBand.body}
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 lg:items-end lg:shrink-0">
            <Link
              href={insiderBand.href}
              className="inline-flex items-center gap-2 rounded-xl bg-whatsapp px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-whatsapp-hover hover:shadow-xl active:scale-[0.98]"
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              {insiderBand.cta}
            </Link>
            <p className="text-xs text-forest-light/60">{insiderBand.subtext}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
