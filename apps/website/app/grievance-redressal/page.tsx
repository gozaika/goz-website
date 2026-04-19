import type { Metadata } from 'next';

import { LegalPage } from '@/components/sections/LegalPage';
import { legalCopy } from '@/lib/legal';
import { canonical, openGraphFor, twitterFor } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Grievance Redressal | goZaika',
  description: 'Official grievance channel and response timelines for goZaika.',
  ...canonical('/grievance-redressal'),
  openGraph: openGraphFor(
    '/grievance-redressal',
    'Grievance Redressal | goZaika',
    'How to file a grievance and expected response timelines.',
  ),
  twitter: twitterFor(
    'Grievance Redressal | goZaika',
    'How to file a grievance and expected response timelines.',
  ),
};

export default function GrievanceRedressalPage(): React.ReactElement {
  return <LegalPage title="Grievance Redressal" sections={legalCopy.grievanceRedressal} />;
}
