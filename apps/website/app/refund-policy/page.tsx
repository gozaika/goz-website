import type { Metadata } from 'next';

import { LegalPage } from '@/components/sections/LegalPage';
import { legalCopy } from '@/lib/legal';
import { canonical, openGraphFor, twitterFor } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Cancellation & Refund Policy | goZaika',
  description: 'Eligibility criteria and process for cancellation and refunds.',
  ...canonical('/refund-policy'),
  openGraph: openGraphFor(
    '/refund-policy',
    'Cancellation & Refund Policy | goZaika',
    'Clear policy guidance for cancellation and refund scenarios.',
  ),
  twitter: twitterFor(
    'Cancellation & Refund Policy | goZaika',
    'Clear policy guidance for cancellation and refund scenarios.',
  ),
};

export default function RefundPolicyPage(): React.ReactElement {
  return <LegalPage title="Cancellation & Refund Policy" sections={legalCopy.refundPolicy} />;
}
