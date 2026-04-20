import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { Reveal } from '@/components/ui/Reveal';
import { SectionIntro } from '@/components/ui/SectionIntro';
import { aboutContent } from '@/lib/content';
import { canonical, openGraphFor, twitterFor } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'About goZaika',
  description:
    'goZaika exists to build a trust-led discovery layer for premium restaurant food access.',
  ...canonical('/about'),
  openGraph: openGraphFor(
    '/about',
    'About goZaika',
    'Mission, values, and launch principles behind goZaika.',
  ),
  twitter: twitterFor(
    'About goZaika',
    'Mission, values, and launch principles behind goZaika.',
  ),
};

export default function AboutPage(): React.ReactElement {
  return (
    <>
      <section className="bg-cream">
        <div className="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <SectionIntro titleAs="h1" title={aboutContent.title} className="max-w-4xl" />
          <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:items-center">
            <Reveal as="div" className="space-y-4" amount={0.15}>
              {aboutContent.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-base leading-relaxed text-gray700">
                  {paragraph}
                </p>
              ))}
            </Reveal>
            <Reveal as="div" className="reveal-media premium-card rounded-3xl bg-white p-4" amount={0.15} delayClass="reveal-delay-160">
              <Image
                src="/images/about-illustration-v1.svg"
                alt="About goZaika visual showing curated bag on kitchen counter"
                width={800}
                height={600}
                className="h-auto w-full rounded-3xl transition-transform duration-300 hover:scale-[1.01]"
              />
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8">
          <Reveal as="div" className="premium-card my-12 rounded-2xl bg-forest p-8 text-center text-white" amount={0.18}>
            <p className="mb-3 text-xs uppercase tracking-[0.24em] text-forest-light">
              Our Mission
            </p>
            <p className="mx-auto max-w-xl text-2xl font-bold leading-snug [font-family:var(--font-display)]">
              {aboutContent.mission}
            </p>
          </Reveal>
        </div>
      </section>

      <section className="bg-cream">
        <div className="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8">
          <SectionIntro title="What we believe" />
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {aboutContent.values.map((value, index) => (
              <Reveal
                as="div"
                key={value}
                className="premium-card premium-card-hover rounded-r-xl border-l-4 border-saffron bg-saffron-light p-5"
                amount={0.12}
                delayClass={index % 2 === 1 ? 'reveal-delay-100' : undefined}
              >
                <p className="font-semibold text-gray900">{value}</p>
              </Reveal>
            ))}
          </div>

          <Reveal as="div" className="premium-card mt-12 rounded-2xl bg-white p-8" amount={0.18}>
            <h3 className="text-xl font-semibold text-gray900">{aboutContent.hyderabadHeading}</h3>
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-gray700">
              {aboutContent.hyderabadBody}
            </p>
            <Link
              href="/contact"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-md bg-saffron px-6 text-base font-semibold text-gray900 transition-colors hover:bg-[var(--color-saffron-hover)]"
            >
              Contact Us
            </Link>
          </Reveal>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/#waitlist"
              className="inline-flex h-12 items-center justify-center rounded-md bg-saffron px-6 text-base font-semibold text-gray900 transition-colors hover:bg-[var(--color-saffron-hover)]"
            >
              Join Waitlist
            </Link>
            <Link
              href="/for-restaurants"
              className="inline-flex h-12 items-center justify-center rounded-md border border-forest px-6 text-base font-semibold text-forest transition-colors hover:bg-forest hover:text-white"
            >
              For Restaurants
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
