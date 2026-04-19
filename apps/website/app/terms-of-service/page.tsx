import type { Metadata } from 'next';

import { LegalPage } from '@/components/sections/LegalPage';
import { legalCopy } from '@/lib/legal';
import { canonical, openGraphFor, twitterFor } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Terms of Service | goZaika',
  description: 'Terms governing use of the goZaika website and experience.',
  ...canonical('/terms-of-service'),
  openGraph: openGraphFor(
    '/terms-of-service',
    'Terms of Service | goZaika',
    'Platform rules, obligations, and jurisdiction details.',
  ),
  twitter: twitterFor(
    'Terms of Service | goZaika',
    'Platform rules, obligations, and jurisdiction details.',
  ),
};

export default function TermsOfServicePage(): React.ReactElement {
  return <LegalPage title="Terms of Service" sections={legalCopy.termsOfService} />;
}
