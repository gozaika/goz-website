/**
 * @file apps/website/app/insider/page.tsx
 * @description goZaika Insider — WhatsApp drop-alert landing page.
 * Slice 3.4 (WhatsApp Growth Engine) backend wires up after launch.
 */

import type { Metadata } from 'next';

import { MessageCircle, Bell, MapPin, Shield } from 'lucide-react';

import { InsiderForm } from '@/components/forms/InsiderForm';
import { Reveal } from '@/components/ui/Reveal';
import { SectionIntro } from '@/components/ui/SectionIntro';
import { canonical, openGraphFor, twitterFor } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'goZaika Insider — Drop Alerts on WhatsApp',
  description:
    'Get WhatsApp alerts when a new BAM Bag drops near you in Hyderabad. Free. No app needed. Just a message when something great is ready.',
  ...canonical('/insider'),
  openGraph: openGraphFor(
    '/insider',
    'goZaika Insider — Drop Alerts on WhatsApp',
    'Be first to know when a BAM Bag drops near you. Banjara Hills, Jubilee Hills, HITEC City, Kondapur.',
    '/images/social/og-home-v2.svg',
  ),
  twitter: twitterFor(
    'goZaika Insider — Drop Alerts on WhatsApp',
    'Be first to know when a BAM Bag drops near you in Hyderabad.',
    '/images/social/og-home-v2.svg',
  ),
};

const benefits = [
  {
    icon: Bell,
    title: 'First to know',
    body: "BAM Bags sell out. Insiders get the alert before anyone else — giving you the best chance at the drops you actually want.",
  },
  {
    icon: MapPin,
    title: 'Your area only',
    body: 'We only alert you about drops in the neighbourhood you selected. No noise, no irrelevant pings from the other side of the city.',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp. No app needed.',
    body: 'No download, no account, no notification settings to manage. Just one message on WhatsApp when something good is ready near you.',
  },
  {
    icon: Shield,
    title: 'No spam. Ever.',
    body: 'Your number is used exclusively for goZaika drop alerts. We will never pass it to third parties or use it for marketing campaigns.',
  },
] as const;

export default function InsiderPage(): React.ReactElement {
  return (
    <>
      {/* Hero */}
      <section className="bg-forest text-white">
        <div className="mx-auto max-w-screen-xl px-4 py-20 sm:px-6 lg:grid lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-28 lg:px-8">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-saffron">
              GOZAIKA INSIDER
            </p>
            <h1 className="font-playfair text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-[3.5rem]">
              Get drop alerts<br />
              <span className="text-saffron">on WhatsApp.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-forest-light/90">
              Be the first to know when a new BAM Bag drops near you in Hyderabad.
              No app. No algorithm. Just a WhatsApp message from goZaika when something
              great is ready in your area.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm text-forest-light/75">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#25D366]" aria-hidden="true" />
                Banjara Hills
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#25D366]" aria-hidden="true" />
                Jubilee Hills
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#25D366]" aria-hidden="true" />
                HITEC City
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#25D366]" aria-hidden="true" />
                Kondapur
              </span>
            </div>
          </div>

          {/* Form card */}
          <Reveal
            as="div"
            className="mt-12 rounded-3xl bg-white p-8 shadow-2xl lg:mt-0"
            amount={0.15}
          >
            <h2 className="mb-6 text-xl font-bold text-gray900">
              Join the Insider list
            </h2>
            <InsiderForm />
          </Reveal>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-cream" aria-labelledby="insider-benefits-heading">
        <div className="mx-auto max-w-screen-xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionIntro
            title="Why be an Insider?"
            body="goZaika Insider is a no-noise, no-app alert service designed for people who take food seriously."
            centered
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <Reveal
                  as="div"
                  key={benefit.title}
                  className="premium-card rounded-2xl bg-white p-6"
                  amount={0.12}
                  delayClass={
                    index === 1
                      ? 'reveal-delay-80'
                      : index === 2
                        ? 'reveal-delay-160'
                        : index === 3
                          ? 'reveal-delay-240'
                          : undefined
                  }
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-saffron/10 text-saffron">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-semibold text-gray900">{benefit.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray700">{benefit.body}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Privacy note */}
      <section className="bg-white">
        <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl rounded-2xl border border-forest-light bg-forest-light/30 p-6 text-center">
            <Shield className="mx-auto mb-3 h-6 w-6 text-forest" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-gray700">
              Your phone number is stored securely and used only for goZaika drop alerts.
              You can opt out at any time by replying <strong>STOP</strong> to any message.
              We comply with TRAI DND regulations and the DPDP Act 2023.{' '}
              <a href="/privacy-policy" className="font-medium text-forest underline underline-offset-2">
                Read our Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
