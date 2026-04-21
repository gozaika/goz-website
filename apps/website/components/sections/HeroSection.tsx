import Image from 'next/image';
import { HeroWaitlistCapture } from '@/components/sections/HeroWaitlistCapture';

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
  return (
    <section id="hero" className="bg-cream">
      <div className="mx-auto grid max-w-screen-xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8 lg:py-24">
        <div className="order-1">
          <span className="inline-flex rounded-full border border-forest px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-forest">
            {eyebrow}
          </span>

          <h1 className="heading-hero mt-6 max-w-xl text-gray900">
            {headline}
          </h1>

          <p className="mt-4 text-base font-medium text-forest">
            {supportLine}
          </p>

          <p className="mt-2 text-sm text-gray500">
            {founderLine}
          </p>

          <p className="text-lead mt-5 max-w-md text-gray600">
            {body}
          </p>

          <HeroWaitlistCapture />

          {/* PHASE 2: Replace hardcoded waitlist count with live database count. */}
          <p className="mt-3 text-sm text-gray500">
            {waitlistCount} people already on the waitlist
          </p>

          <p className="mt-4 text-sm text-gray500">
            {helper}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
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
          </div>
          {/* PHASE 2: Replace dynamically with real count from Supabase once ≥50 real signups. */}
          <p className="mt-2 text-sm text-gray600">
            {socialProof}
          </p>
        </div>

        <div className="order-2 relative flex items-center justify-center">
          <div className="ambient-glow ambient-glow-saffron bottom-14 left-14 hidden h-40 w-40 lg:block" />
          <div className="ambient-glow ambient-glow-forest right-10 top-10 hidden h-48 w-48 lg:block" />
          <div className="floating-illustration relative flex items-center justify-center">
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
          </div>
        </div>
      </div>
    </section>
  );
}
