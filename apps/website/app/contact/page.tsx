import type { Metadata } from 'next';

import { ContactForm } from '@/components/forms/ContactForm';
import { Card } from '@/components/ui/Card';
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
    <div className="mx-auto max-w-screen-xl px-4 py-16 md:px-6 lg:px-8">
      <h1 className="text-4xl font-bold text-gray900 md:text-5xl">
        We&apos;re a small team. We respond to every message.
      </h1>
      <p className="mt-4 max-w-3xl text-base text-gray700">
        Whether you are a food explorer, restaurant owner, investor, or collaborator,
        we would love to hear from you.
      </p>
      <Card className="mt-8 max-w-2xl">
        <ContactForm />
      </Card>
      <p className="mt-4 text-sm text-gray700">Or reach us at hello@gozaika.in</p>
    </div>
  );
}
