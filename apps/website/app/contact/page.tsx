import type { Metadata } from 'next';

import { ContactForm } from '@/components/forms/ContactForm';
import { Reveal } from '@/components/ui/Reveal';
import { SectionIntro } from '@/components/ui/SectionIntro';
import { canonical, openGraphFor, twitterFor } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Contact goZaika',
  description:
    'Reach the goZaika team for partnerships, investor queries, and collaboration.',
  ...canonical('/contact'),
  openGraph: openGraphFor(
    '/contact',
    'Contact goZaika',
    'We are a small team and we respond to every message.',
  ),
  twitter: twitterFor(
    'Contact goZaika',
    'We are a small team and we respond to every message.',
  ),
};

export default function ContactPage(): React.ReactElement {
  return (
    <>
      <section className="bg-cream">
        <div className="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <SectionIntro
            titleAs="h1"
            title="We're a small team. We read every message."
            body="Restaurant owner, investor, collaborator, or just curious — reach out."
            className="max-w-3xl"
          />
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8">
          <Reveal as="div" className="premium-card max-w-2xl rounded-2xl bg-white p-8" amount={0.16}>
            <ContactForm />
          </Reveal>
          <p className="mt-4 text-sm text-gray700">
            hello@gozaika.in {' · '} We aim to respond within 24 hours
          </p>
        </div>
      </section>
    </>
  );
}
