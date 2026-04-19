/**
 * @file apps/website/lib/faqs.ts
 * @description FAQ dataset for consumer and restaurant intent pages.
 */

export interface FaqItem {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
  readonly category: 'consumer' | 'restaurant' | 'safety';
}

export const faqs: ReadonlyArray<FaqItem> = [
  {
    id: 'bam-bag-definition',
    question: 'What exactly is a BAM Bag?',
    answer:
      'A BAM Bag (Big Aayega Maza) is a chef-curated to-go selection from a partner restaurant. Contents are undisclosed until pickup, with allergen details shown before purchase.',
    category: 'consumer',
  },
  {
    id: 'food-safety',
    question: 'How do I know if the food is safe?',
    answer:
      'Partner restaurants are FSSAI-licensed and each listing carries allergen disclosures. goZaika operates pickup-first to preserve kitchen quality control.',
    category: 'safety',
  },
  {
    id: 'pickup-process',
    question: 'How does pickup work?',
    answer:
      'You receive a confirmation after payment. Visit the restaurant within the listed pickup window and show your order confirmation.',
    category: 'consumer',
  },
  {
    id: 'refund',
    question: 'Can I cancel or get a refund?',
    answer:
      "BAM Bags are non-cancellable once the restaurant receives your order (immediately on payment). We issue refunds in specific cases: the restaurant couldn't fulfil your bag, you had a documented allergic reaction to an undisclosed allergen, or a technical error caused a duplicate charge. See our full Refund Policy for details.",
    category: 'consumer',
  },
  {
    id: 'partner-commission',
    question: 'What is the commission structure for partners?',
    answer:
      'The structure is 0% for onboarding, 12% in pilot, and 15% post-pilot, with a volume tier for high-throughput partners.',
    category: 'restaurant',
  },
  {
    id: 'partner-control',
    question: 'Who decides what goes in each bag?',
    answer:
      'The restaurant does. goZaika provides discovery and payment flow, while partners define curation, pickup windows, and brand experience.',
    category: 'restaurant',
  },
  {
    id: 'severe-allergy',
    question: 'What if I have a severe food allergy?',
    answer:
      'Every BAM Bag listing discloses all 14 major allergens specified by FSSAI before purchase. If you have a severe allergy, we strongly recommend contacting the restaurant directly before claiming a bag. Our allergen data is provided by the restaurant partner and we cannot guarantee zero cross-contamination risk.',
    category: 'safety',
  },
  {
    id: 'missed-pickup-window',
    question: 'What happens if I miss the pickup window?',
    answer:
      'BAM Bags are prepared for your pickup window. If you miss it, the bag cannot be held indefinitely — kitchen safety standards apply. Missing the pickup window does not qualify for a refund. Please check our Refund Policy for the full conditions.',
    category: 'consumer',
  },
  {
    id: 'outside-hyderabad',
    question: 'Is this available outside Hyderabad?',
    answer:
      "Not yet. We are launching in Hyderabad first — specifically Banjara Hills, Jubilee Hills, and Kondapur. Other cities will follow once we've proven the model with depth, not just coverage. Join the waitlist and select 'Other City' to register interest for your area.",
    category: 'consumer',
  },
  {
    id: 'swaad-club',
    question: 'What is Swaad Club?',
    answer:
      'Swaad Club is our upcoming loyalty programme. Earn points on every BAM Bag you claim. Redeem for early access to exclusive drops and partner rewards. Launching with the goZaika app.',
    category: 'consumer',
  },
];
