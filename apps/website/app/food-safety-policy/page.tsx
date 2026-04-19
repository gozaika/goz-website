import type { Metadata } from 'next';

import { LegalPage } from '@/components/sections/LegalPage';
import { legalCopy } from '@/lib/legal';
import { canonical, openGraphFor, twitterFor } from '@/lib/metadata';

export const metadata: Metadata = {
  title: 'Food Safety Policy | goZaika',
  description: 'Food safety standards, allergen disclosures, and issue reporting process.',
  ...canonical('/food-safety-policy'),
  openGraph: openGraphFor(
    '/food-safety-policy',
    'Food Safety Policy | goZaika',
    'How goZaika and partners uphold kitchen and allergen standards.',
  ),
  twitter: twitterFor(
    'Food Safety Policy | goZaika',
    'How goZaika and partners uphold kitchen and allergen standards.',
  ),
};

export default function FoodSafetyPolicyPage(): React.ReactElement {
  return <LegalPage title="Food Safety Policy" sections={legalCopy.foodSafetyPolicy} />;
}
