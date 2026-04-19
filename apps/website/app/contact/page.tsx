import type { Metadata } from 'next';

import { ContactForm } from '@/components/forms/ContactForm';
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
          <h1 className="heading-page max-w-3xl text-gray900">
            We&apos;re a small team. We read every message.
          </h1>
          <p className="text-lead mt-4 max-w-3xl text-gray700">
            Restaurant owner, investor, collaborator, or just curious — reach out.
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl rounded-2xl bg-white p-8 shadow-[0_10px_40px_rgba(26,92,56,0.1)]">
            <ContactForm />
          </div>
          <p className="mt-4 text-sm text-gray700">
            hello@gozaika.in {' · '} We aim to respond within 24 hours
          </p>
        </div>
      </section>
    </>
  );
}
