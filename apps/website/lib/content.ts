/**
 * @file apps/website/lib/content.ts
 * @description Locked website copy for goZaika phase-one launch.
 */

export const homeContent = {
  hero: {
    eyebrow: 'LAUNCHING IN HYDERABAD',
    headline: "India's first mystery meal drop.",
    supportLine: 'BAM! बड़ा ज़ायका, आएगा मज़ा',
    body: "BAM Bags from Hyderabad's best restaurants — chef-curated, allergen-disclosed, always a surprise.",
    helper: 'Join the waitlist · Free · No spam',
    socialProof: 'Be among the first in Hyderabad',
  },
  trustBadges: [
    {
      title: 'Chef-Curated Drops',
      subtitle: 'Restaurants decide every bag',
    },
    {
      title: 'Allergens Always Disclosed',
      subtitle: 'All 14 FSSAI-listed allergens',
    },
    {
      title: 'Pickup Only',
      subtitle: 'Direct from the kitchen',
    },
  ],
  howItWorks: [
    {
      title: 'Discover',
      description:
        'Find drops in your area and choose the kind of experience that fits you.',
      icon: '/images/step-browse-v2.svg',
    },
    {
      title: 'Claim',
      description:
        'Pay once. Your pickup window is locked. Your QR code is yours.',
      icon: '/images/step-buy-v2.svg',
    },
    {
      title: 'Pickup',
      description:
        'Collect during the pickup window and let the restaurant surprise you.',
      icon: '/images/step-pickup-v2.svg',
    },
  ],
  bamBag: {
    eyebrow: 'What is a BAM Bag?',
    heading: 'Not a deal. A discovery.',
    body: "Every BAM Bag is a chef-curated to-go selection from a partner restaurant. The dishes are a surprise — but every allergen, dietary category, spice level, and pickup window is disclosed before you buy. You don't know what's inside. You always know it's safe for you.",
    callout:
      "goZaika is not a discount app, a rescue app, or a leftover platform. It is a controlled-access, off-menu discovery layer for people who want great food without the algorithm.",
  },
  restaurantTeaser: {
    eyebrow: 'For Restaurants',
    heading: 'Recover cost, not reputation.',
    body: "A zero-friction channel for your kitchen's intentional releases. You design the bag. We surface it to the right people.",
    stats: [
      { value: '12%', label: 'Commission — lowest in category' },
      { value: '0%', label: 'First 30 days free' },
      { value: '0', label: 'Delivery ops — pickup only' },
    ],
    cta: 'Become a Partner',
  },
  launch: {
    heading: 'Launching in Hyderabad',
    body: 'Join the waitlist to hear about launch windows, first restaurant reveals, and the first premium BAM Bag drops near you.',
    disclaimer:
      '*Preview listings are illustrative only. Final restaurant partners will be announced at launch.',
  },
  partnerPreviews: [
    {
      name: 'The Spice Lab',
      cuisine: 'Contemporary Indian',
      area: 'Banjara Hills',
      pickup: 'Pickup 7-9 PM',
      value: 'Value INR600+',
    },
    {
      name: 'Garden Terrace',
      cuisine: 'Modern Vegetarian',
      area: 'Jubilee Hills',
      pickup: 'Pickup 6-8 PM',
      value: 'Value INR450+',
    },
    {
      name: 'The Coastal Kitchen',
      cuisine: 'Seafood & Coastal',
      area: 'Kondapur',
      pickup: 'Pickup 7-9 PM',
      value: 'Value INR700+',
    },
  ],
} as const;

export const howItWorksContent = {
  title: 'How a BAM Bag works',
  subtitle: 'A mystery meal drop. Curated by chefs. Claimed by you.',
  steps: [
    {
      heading: 'Browse',
      body: 'Find drops near you sorted by cuisine, distance, and pickup time. Every listing shows what you need without revealing exact dishes.',
      icon: '/images/step-browse-v2.svg',
    },
    {
      heading: 'Claim',
      body: 'Pay once. Your pickup window is locked. Your QR code is yours.',
      icon: '/images/step-buy-v2.svg',
    },
    {
      heading: 'Pickup',
      body: 'Walk to the restaurant, show your QR confirmation, and collect your bag during the stated time window.',
      icon: '/images/step-pickup-v2.svg',
    },
    {
      heading: 'Discover (and return)',
      body: 'Share what you got. Rate the experience. Earn Swaad Club points for your next drop. Each bag is a new restaurant, a new story, and a reason to come back.',
      icon: '/images/step-browse-v2.svg',
    },
  ],
  allergenCalloutHeading: 'Your safety is disclosed, always.',
  allergenCalloutBody:
    'Every goZaika listing declares all 14 major allergens specified by FSSAI before you buy. Not after. Not at pickup. Before you pay.',
  prePurchaseDetails: [
    {
      title: 'Indicative price and value',
      body: 'You will see the purchase price and the expected value range before you claim a bag. The point is discovery, not bargain-basement framing.',
    },
    {
      title: 'What “Claim” means',
      body: 'Claiming a BAM Bag means payment is complete, your pickup window is reserved, and a QR code is generated for collection.',
    },
    {
      title: 'Pickup verification',
      body: 'At pickup, you show your QR code. The restaurant verifies the order, hands over the bag, and the transaction is complete.',
    },
    {
      title: 'What you will see before purchase',
      body: 'Cuisine type, dietary category, spice level, allergen disclosures, pickup window, quantity status, and indicative value are disclosed before payment.',
    },
    {
      title: 'How often drops happen',
      body: 'Drops are limited and restaurant-led. Frequency depends on partner release patterns, not a fixed daily schedule.',
    },
    {
      title: 'Limited quantity and filters',
      body: 'Bags are limited quantity by design. Filters will include dietary type, cuisine identity, spice level, and neighborhood in addition to allergens.',
    },
  ],
  roadmapNote: 'App and mobile web checkout on the way. Join the waitlist today.',
} as const;

export const forRestaurantsContent = {
  title: "The lowest-friction revenue channel you've never had.",
  subtitle:
    "12% commission. Zero delivery riders. Your restaurant name always front and centre. The only platform built to protect what you've spent years building.",
  kitchenFlow: [
    {
      title: 'You control the bag',
      body: 'Set your pickup window, allergens, cuisine type, and bag value. goZaika surfaces it to nearby consumers. You curate. We distribute.',
    },
    {
      title: 'No delivery operations',
      body: 'Your customer walks in, shows a QR code, picks up the bag. No rider coordination, no packaging SLAs, no delivery radius.',
    },
    {
      title: 'Your brand stays intact',
      body: "Your restaurant name, cuisine identity, and story are front-and-centre on every listing. goZaika never describes your food as 'surplus' or 'leftover' to consumers. Ever.",
    },
  ],
  onboardingSteps: [
    {
      title: '1. Onboard',
      body: 'We review fit, gather your operating details, and align on pickup windows, disclosures, and release logic.',
    },
    {
      title: '2. Publish',
      body: 'Your team sets the bag value, allergens, cuisine type, quantity, and timing. goZaika turns that into a live listing.',
    },
    {
      title: '3. Fulfil',
      body: 'Orders appear against your live release. Your team verifies QR pickup at handoff. No riders. No delivery coordination.',
    },
    {
      title: '4. Reconcile',
      body: 'You receive settlement reporting, release performance, and operational visibility on what moved, when, and for whom.',
    },
  ],
  comparisonRows: [
    {
      phase: 'First 30 days',
      commission: '0%',
      notes: 'Free onboarding period to launch your first bags without platform fees.',
    },
    {
      phase: 'Pilot phase',
      commission: '12%',
      notes: 'Lowest-in-category commission while Hyderabad supply is being built.',
    },
    {
      phase: 'Standard',
      commission: '15%',
      notes: 'Applies after pilot once the city network and demand loops mature.',
    },
    {
      phase: 'Volume tier',
      commission: '12%',
      notes: 'Available for partners releasing 200+ bags per month.',
    },
    {
      phase: 'Zayka Pro SaaS',
      commission: 'INR2,499/mo',
      notes: 'Optional software layer for deeper merchandising and reporting.',
    },
  ],
  differentiators: [
    {
      title: 'Protect brand dignity',
      body: 'You decide what goes out, how it is framed, and who discovers it.',
    },
    {
      title: 'Commission that stays lean',
      body: 'The economics are designed to recover cost without creating delivery drag.',
    },
    {
      title: 'Pickup keeps operations simple',
      body: 'No riders, no dispatch complexity, and no compromise on kitchen control.',
    },
  ],
  operationalNotes: [
    {
      title: 'Settlement timing',
      body: 'Settlements should be treated as a scheduled operating flow, not an ad-hoc reconciliation exercise. The page should communicate clear settlement windows tied to completed pickups.',
    },
    {
      title: 'Partner requirements',
      body: 'Partners should be FSSAI compliant, operationally reliable during pickup windows, and able to maintain accurate disclosure standards.',
    },
    {
      title: 'Sample dashboard / portal',
      body: 'Restaurants need a view of live releases, claimed bags, pickup status, customer-facing disclosures, and settlement visibility.',
    },
    {
      title: 'Customer support ownership',
      body: 'goZaika owns platform-side support and payment-path issues. The restaurant owns product quality at pickup and in-kitchen execution.',
    },
    {
      title: 'POS integration status',
      body: 'POS integration is not required for launch. The current model is operationally light and QR-led, with integrations introduced only where they remove real friction.',
    },
    {
      title: 'No-shows and volume tier',
      body: 'No-show handling should be explicit, and the volume tier should be explained as a meaningful threshold for recurring monthly release volume rather than a vague promise.',
    },
  ],
  operationalFaqs: [
    {
      question: 'What does onboarding look like?',
      answer:
        'Onboarding covers operating fit, disclosures, pickup workflow, release logic, and launch readiness. We do not rush restaurants into a live state before those pieces are clear.',
    },
    {
      question: 'Who handles customer support?',
      answer:
        'goZaika handles platform and payment-path communication. The restaurant handles the in-store pickup experience and any kitchen-specific handoff issues.',
    },
    {
      question: 'Is POS integration required?',
      answer:
        'No. The initial operating model is intentionally light. QR verification and release management are enough for launch. Integrations come later if they remove real friction.',
    },
    {
      question: 'What happens on a no-show?',
      answer:
        'BAM Bags are tied to a declared pickup window. If a customer does not arrive, the bag is not held indefinitely. The operator should have a clear closure rule and the platform should communicate that policy upfront.',
    },
    {
      question: 'What does the volume tier mean in practice?',
      answer:
        'The volume tier is meant for partners releasing bags consistently enough to justify more favorable economics. It should be framed as recurring monthly release depth, not just sporadic spikes.',
    },
  ],
} as const;

export const aboutContent = {
  title:
    "We built goZaika because India's best restaurants deserve a smarter exit for great food.",
  paragraphs: [
    "Every evening, kitchens across India produce more than they sell. That output — carefully prepared, fully safe, restaurant-quality — has nowhere to go that doesn't compromise the brand. It doesn't belong in a discount bin. It doesn't belong in a charity channel. It belongs in the hands of someone who will genuinely love it.",
    'goZaika creates that path. We call our drops BAM Bags — Big Aayega Maza. Chef-curated, allergen-disclosed, mystery to-go selections from restaurants that have chosen to release them on their own terms. The restaurant designs the experience. We surface it to the right people.',
    'We are building in Hyderabad first — intentionally, slowly, and with deep alignment with the restaurants we partner with. We believe trust is built city by city, kitchen by kitchen. Not by scale.',
  ],
  mission: 'To build a world where great food finds great people, every single evening.',
  values: [
    'Premium without pretence',
    'Restaurant dignity first',
    'Radical transparency',
    'City-by-city intentional growth',
  ],
  hyderabadHeading: 'Building in Hyderabad',
  hyderabadBody:
    'Launching in Banjara Hills, Jubilee Hills, and Kondapur. If you are a restaurant owner, investor, or collaborator in Hyderabad — we would love to hear from you.',
} as const;

export const contactSubjects = [
  { value: 'general', label: 'General' },
  { value: 'restaurant', label: 'Restaurant Partnership' },
  { value: 'investor', label: 'Investor Enquiry' },
  { value: 'press', label: 'Press' },
  { value: 'careers', label: 'Careers' },
] as const;
