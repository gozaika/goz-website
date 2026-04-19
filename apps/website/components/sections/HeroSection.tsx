'use client';

import * as React from 'react';

import Image from 'next/image';
import { Reveal } from '@/components/ui/Reveal';

interface HeroSectionProps {
  eyebrow: string;
  headline: string;
  body: string;
  helper: string;
}

export function HeroSection({
  eyebrow,
  headline,
  body,
  helper,
}: HeroSectionProps): React.ReactElement {
  const [email, setEmail] = React.useState<string>('');

  const handleSubmit = (event: React.FormEvent<HTMLElement>): void => {
    event.preventDefault();

    if (typeof window === 'undefined') {
      return;
    }

    window.sessionStorage.setItem('gozaika_waitlist_prefill_email', email);
    window.dispatchEvent(new CustomEvent('gozaika:prefill-waitlist-email', { detail: email }));
    window.location.hash = 'waitlist';
  };

  return (
    <section id="hero" className="bg-cream">
      <div className="mx-auto grid max-w-screen-xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8 lg:py-24">
        <div className="order-1">
          <Reveal
            as="span"
            className="inline-flex rounded-full border border-forest px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-forest"
            amount={0.25}
          >
            {eyebrow}
          </Reveal>

          <Reveal
            as="h1"
            className="heading-hero mt-6 max-w-xl text-balance text-gray900"
            amount={0.25}
            delayClass="reveal-delay-100"
          >
            {headline}
          </Reveal>

          <Reveal
            as="p"
            className="text-lead mt-5 max-w-md text-gray600"
            amount={0.25}
            delayClass="reveal-delay-200"
          >
            {body}
          </Reveal>

          <Reveal
            as="form"
            className="mt-8 flex flex-col gap-3 lg:flex-row"
            onSubmit={handleSubmit}
            amount={0.2}
            delayClass="reveal-delay-300"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email"
              className="h-12 w-full rounded-md border border-gray200 bg-white px-4 text-base text-gray900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-saffron lg:flex-1"
            />
            <button
              type="submit"
              className="h-12 rounded-md bg-saffron px-8 text-sm font-semibold text-gray900 transition-colors hover:bg-[var(--color-saffron-hover)] lg:shrink-0"
            >
              Join Waitlist
            </button>
          </Reveal>

          <p className="mt-4 text-sm text-gray500">{helper}</p>
        </div>

        <div className="order-2 relative flex items-center justify-center">
          <div className="floating-illustration relative flex items-center justify-center">
            <Image
              src="/images/hero-bam-bag-v2.svg"
              alt="goZaika mystery meal bag illustration"
              width={620}
              height={620}
              className="h-auto w-full max-w-xl"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
