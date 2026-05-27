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
    id: 'gozaika-definition',
    question: 'What is goZaika?',
    answer:
      'goZaika is a pickup-first restaurant discovery platform. Restaurants publish limited, chef-curated BAM Bag drops, and diners claim them for pickup with price, allergens, dietary details, and pickup window shown before purchase.',
    category: 'consumer',
  },
  {
    id: 'restaurant-value',
    question: 'How does goZaika help restaurants?',
    answer:
      'goZaika gives restaurants a direct-demand channel for intentional pickup drops. Partners control the food, timing, disclosures, and brand presentation while goZaika handles discovery, payment flow, pickup verification, and settlement visibility.',
    category: 'restaurant',
  },
  {
    id: 'bam-bag-definition',
    question: 'What exactly is a BAM Bag?',
    answer:
      'A BAM Bag (Bada Aayega Maza — बड़ा आएगा मज़ा) is a chef-curated to-go selection from a partner restaurant. Contents are a surprise, but cuisine type, dietary category, spice level, all 14 FSSAI allergens, pickup window, and indicative value are disclosed before you buy.',
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
      'After payment you receive a QR-code confirmation. Walk to the restaurant within the stated pickup window, show your QR to the staff, and collect your bag. No waiting for a rider, no delivery delays — you are at the source, which is the entire point.',
    category: 'consumer',
  },
  {
    id: 'pickup-why-not-delivery',
    question: "Why is pickup-only a feature, not a limitation?",
    answer:
      "Pickup is a deliberate design choice, not a cost-cutting measure. When you collect directly from the kitchen, the food is at peak quality, prepared for your window. Delivery adds 20–45 minutes, packaging compromise, and the risk of a cold or shaken meal. goZaika is about the best version of the food — and that lives at the source.",
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
  {
    id: 'restaurant-cannibalization',
    question: "Will goZaika affect a restaurant's existing walk-in or delivery business?",
    answer:
      "No — by design. BAM Bags are a separate, off-menu drop set to a pickup window the restaurant defines. They do not appear on any delivery aggregator, they do not displace dining covers, and they do not affect your regular takeaway flow. Restaurants control when drops go live and can pause or stop at any point. The channel is additive, not competitive.",
    category: 'restaurant',
  },
  {
    id: 'food-safety-qr',
    question: 'Is there a way to verify the freshness of my bag?',
    answer:
      "Yes. Every BAM Bag carries a freshness certificate. You can scan the QR code on your order confirmation or on the bag tag at pickup to verify that the food was prepared within the declared window and meets goZaika's freshness standards. If the food is outside the safe window, the listing should not be active — this is enforced at the platform level.",
    category: 'safety',
  },
];
