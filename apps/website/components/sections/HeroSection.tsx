'use client';

import * as React from 'react';

import Image from 'next/image';
import { Reveal } from '@/components/ui/Reveal';

interface HeroSectionProps {
  eyebrow: string;
  headline: string;
  supportLine: string;
  founderLine: string;
  body: string;
  helper: string;
  socialProof: string;
  waitlistCount: number;
  trustStrip: ReadonlyArray<string>;
}

export function HeroSection({
  eyebrow,
  founderLine,
  headline,
  socialProof,
  supportLine,
  trustStrip,
  body,
  helper,
  waitlistCount,
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
            className="mt-4 text-base font-medium text-forest"
            amount={0.25}
            delayClass="reveal-delay-160"
          >
            {supportLine}
          </Reveal>

          <Reveal
            as="p"
            className="mt-2 text-sm text-gray500"
            amount={0.25}
            delayClass="reveal-delay-200"
          >
            {founderLine}
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
              className="h-12 w-full rounded-md border border-gray200 bg-white px-4 text-base text-gray900 placeholder:text-gray600 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-saffron lg:flex-1"
            />
            <button
              type="submit"
              className="h-12 rounded-md bg-forest px-8 text-sm font-semibold text-white transition-colors hover:bg-forest/95 lg:shrink-0"
            >
              Join Waitlist
            </button>
          </Reveal>

          {/* PHASE 2: Replace hardcoded waitlist count with live database count. */}
          <Reveal
            as="p"
            className="mt-3 text-sm text-gray500"
            amount={0.2}
            delayClass="reveal-delay-300"
          >
            {waitlistCount} people already on the waitlist
          </Reveal>

          <Reveal
            as="p"
            className="mt-4 text-sm text-gray500"
            amount={0.2}
            delayClass="reveal-delay-300"
          >
            {helper}
          </Reveal>
          <Reveal
            as="div"
            className="mt-4 flex flex-wrap gap-3"
            amount={0.2}
            delayClass="reveal-delay-300"
          >
            {trustStrip.map((item) => (
              <div
                key={item}
                className="inline-flex items-center gap-2 rounded-full border border-forest/12 bg-white/70 px-3 py-1.5 text-xs text-gray600 backdrop-blur-sm"
              >
                <svg
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 text-forest"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m4 10 4 4 8-8" />
                </svg>
                <span>{item}</span>
              </div>
            ))}
          </Reveal>
          {/* PHASE 2: Replace dynamically with real count from Supabase once ≥50 real signups. */}
          <Reveal
            as="p"
            className="mt-2 text-sm text-gray600"
            amount={0.2}
            delayClass="reveal-delay-300"
          >
            {socialProof}
          </Reveal>
        </div>

        <div className="order-2 relative flex items-center justify-center">
          <div className="ambient-glow ambient-glow-saffron bottom-14 left-14 h-40 w-40" />
          <div className="ambient-glow ambient-glow-forest right-10 top-10 h-48 w-48" />
          <Reveal
            as="div"
            className="reveal-media floating-illustration relative flex items-center justify-center"
            amount={0.15}
            delayClass="reveal-delay-160"
          >
            <div className="rounded-[2rem] border border-white/50 bg-white/55 p-4 backdrop-blur-sm">
              <Image
                src="/images/hero-bam-bag-v2.svg"
                alt="goZaika mystery meal bag illustration"
                width={620}
                height={620}
                className="h-auto w-full max-w-xl"
                priority
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
