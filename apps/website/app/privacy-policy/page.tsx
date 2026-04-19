import type { Metadata } from 'next';

import { LegalPage } from '@/components/sections/LegalPage';
import { legalCopy } from '@/lib/legal';
import { canonical, openGraphFor, twitterFor } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Privacy Policy | goZaika',
  description: 'How goZaika collects, stores, and protects personal data.',
  ...canonical('/privacy-policy'),
  openGraph: openGraphFor(
    '/privacy-policy',
    'Privacy Policy | goZaika',
    'Data use and rights information aligned to Indian regulations.',
  ),
  twitter: twitterFor(
    'Privacy Policy | goZaika',
    'Data use and rights information aligned to Indian regulations.',
  ),
};

export default function PrivacyPolicyPage(): React.ReactElement {
  return <LegalPage title="Privacy Policy" sections={legalCopy.privacyPolicy} />;
}
