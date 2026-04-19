import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { EnergyAccent } from '@/components/sections/EnergyAccent';
import { HomeSectionProgress } from '@/components/sections/HomeSectionProgress';
import { WaitlistForm } from '@/components/forms/WaitlistForm';
import { Card } from '@/components/ui/Card';
import { InteractiveHoverCard } from '@/components/ui/InteractiveHoverCard';
import { MotionReveal } from '@/components/ui/MotionReveal';
import { homeContent } from '@/lib/content';
import { canonical, openGraphFor, twitterFor } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'goZaika — Discover. Pickup. Devour.',
  description:
    'Discover chef-curated BAM Bags from premium restaurants near you. Buy, pickup, and devour.',
  ...canonical('/'),
  openGraph: openGraphFor(
    '/',
    'goZaika — Discover. Pickup. Devour.',
    'Premium-access mystery meal drops from trusted restaurants.',
    '/images/social/og-home-v2.svg',
  ),
  twitter: twitterFor(
    'goZaika — Discover. Pickup. Devour.',
    'Premium-access mystery meal drops from trusted restaurants.',
    '/images/social/og-home-v2.svg',
  ),
};

export default function HomePage(): React.ReactElement {
  const stepIcons = [
    '/images/step-browse-v2.svg',
    '/images/step-buy-v2.svg',
    '/images/step-pickup-v2.svg',
  ] as const;

  return (
    <div className="space-y-2 pb-8">
      <HomeSectionProgress />

      <section
        id="hero"
        className="section-shell relative mx-auto grid max-w-screen-xl scroll-mt-28 gap-8 px-4 py-16 md:grid-cols-2 md:px-6 lg:px-8 lg:py-24"
      >
        <EnergyAccent />
        <div className="space-y-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-forest">
            {homeContent.hero.eyebrow}
          </p>
          <h1 className="text-balance text-5xl font-bold leading-tight text-gray900 md:text-6xl">
            <span className="hero-highlight">{homeContent.hero.headline}</span>
          </h1>
          <p className="text-xl text-forest">{homeContent.hero.supportLine}</p>
          <p className="max-w-xl text-base leading-relaxed text-gray700">
            {homeContent.hero.body}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="#waitlist"
              className="cta-primary cta-primary-pulse inline-flex rounded-md bg-saffron px-5 py-3 text-sm font-semibold uppercase tracking-wide text-gray900 hover:opacity-90"
            >
              {homeContent.hero.primaryCta}
            </Link>
            <Link
              href="/how-it-works"
              className="cta-secondary inline-flex items-center gap-2 rounded-md border border-forest px-5 py-3 text-sm font-semibold text-forest hover:bg-forest hover:text-white"
            >
              {homeContent.hero.secondaryCta}
              <span className="cta-secondary-arrow" aria-hidden="true">
                {'->'}
              </span>
            </Link>
          </div>
          <p className="text-sm text-gray700">{homeContent.hero.socialProof}</p>
        </div>
        <InteractiveHoverCard>
          <Card variant="featured" className="relative self-start border-saffron/30">
            <Image
              src="/images/hero-bam-bag-v2.svg"
              alt="goZaika BAM Bag hero illustration"
              width={600}
              height={600}
              className="mb-4 h-auto w-full rounded-lg"
              priority
            />
            <h2 className="text-2xl font-semibold text-gray900">What goZaika is</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray700">{homeContent.bamBag.body}</p>
            <p className="mt-4 rounded-md border border-forest/20 bg-white p-4 text-sm text-gray700">
              {homeContent.bamBag.callout}
            </p>
          </Card>
        </InteractiveHoverCard>
      </section>

      <section className="mx-auto max-w-screen-xl px-4 md:px-6 lg:px-8">
        <div className="energy-strip rounded-2xl border border-saffron/20 bg-white/70 px-4 py-4 backdrop-blur-sm">
          <div className="flex flex-wrap gap-3">
            {homeContent.trustPills.map((pill) => (
              <span
                key={pill}
                className="inline-flex rounded-full border border-forest/20 bg-cream px-4 py-2 text-xs font-semibold uppercase tracking-wide text-forest"
              >
                {pill}
              </span>
            ))}
          </div>
        </div>
      </section>

      <MotionReveal
        as="section"
        id="steps"
        className="section-shell mx-auto max-w-screen-xl scroll-mt-28 px-4 py-12 md:px-6 lg:px-8"
      >
        <h2 className="text-3xl font-semibold text-gray900">How a BAM Bag works</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {homeContent.howItWorks.map((step, index) => (
            <MotionReveal key={step.title} delay={index * 0.06}>
              <InteractiveHoverCard>
                <Card hover className="border-saffron/15">
                  <Image
                    src={stepIcons[index] ?? '/images/step-browse-v2.svg'}
                    alt={`${step.title} step icon`}
                    width={80}
                    height={80}
                    className="mb-3 h-16 w-16"
                  />
                  <h3 className="text-xl font-semibold text-gray900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray700">{step.description}</p>
                </Card>
              </InteractiveHoverCard>
            </MotionReveal>
          ))}
        </div>
      </MotionReveal>

      <MotionReveal
        as="section"
        id="partners"
        className="section-shell scroll-mt-28 bg-forest py-12 text-white"
      >
        <div className="mx-auto max-w-screen-xl px-4 md:px-6 lg:px-8">
          <Image
            src="/images/restaurant-hero-v2.svg"
            alt="Restaurant partner opportunity illustration"
            width={800}
            height={600}
            className="mb-6 h-auto w-full rounded-xl bg-white/5 p-2"
          />
          <h2 className="text-3xl font-semibold">{homeContent.restaurantTeaser.heading}</h2>
          <p className="mt-3 max-w-3xl text-base text-white/90">
            {homeContent.restaurantTeaser.body}
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {homeContent.restaurantTeaser.stats.map((stat) => (
              <InteractiveHoverCard key={stat}>
                <Card variant="minimal" className="border-white/30 text-white">
                  <p className="text-sm font-medium">{stat}</p>
                </Card>
              </InteractiveHoverCard>
            ))}
          </div>
          <Link
            href="/for-restaurants"
            className="mt-6 inline-flex rounded-md bg-saffron px-5 py-3 text-sm font-semibold uppercase tracking-wide text-gray900"
          >
            {homeContent.restaurantTeaser.cta}
          </Link>
        </div>
      </MotionReveal>

      <MotionReveal
        as="section"
        id="stories"
        className="section-shell mx-auto max-w-screen-xl scroll-mt-28 px-4 py-12 md:px-6 lg:px-8"
      >
        <h2 className="text-3xl font-semibold text-gray900">What early users are saying</h2>
        <p className="mt-2 text-sm text-gray500">
          Placeholder testimonials for launch phase previews.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {homeContent.testimonials.map((testimonial, index) => (
            <MotionReveal key={testimonial.name} delay={index * 0.07}>
              <InteractiveHoverCard>
                <Card hover className="border-gold/20">
                  <p className="text-sm leading-relaxed text-gray700">&ldquo;{testimonial.quote}&rdquo;</p>
                  <p className="mt-4 text-sm font-semibold text-gray900">{testimonial.name}</p>
                  <p className="text-xs text-gray500">{testimonial.title}</p>
                </Card>
              </InteractiveHoverCard>
            </MotionReveal>
          ))}
        </div>
      </MotionReveal>

      <MotionReveal
        as="section"
        id="waitlist"
        className="mx-auto max-w-screen-xl scroll-mt-28 px-4 py-16 md:px-6 lg:px-8"
      >
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold text-gray900">{homeContent.launch.heading}</h2>
            <p className="text-base text-gray700">{homeContent.launch.body}</p>
            <ul className="space-y-2 text-sm text-gray700">
              {homeContent.partnerPreviews.map((preview) => (
                <li key={preview} className="rounded-md border border-gray200 bg-white p-3">
                  <span className="mr-2 rounded bg-gray200 px-2 py-1 text-xs text-gray700">
                    Preview
                  </span>
                  {preview}
                </li>
              ))}
            </ul>
          </div>
          <Card as="section">
            <WaitlistForm />
          </Card>
        </div>
      </MotionReveal>
    </div>
  );
}
