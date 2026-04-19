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
      'BAM Bags are non-cancellable once the kitchen is notified. Refund exceptions are handled via the Refund Policy route.',
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
];
