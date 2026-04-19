/**
 * @file apps/website/lib/content.ts
 * @description Locked website copy for goZaika phase-one launch.
 */

export const homeContent = {
  hero: {
    eyebrow: "India's mystery meal drop platform",
    headline: 'Drop the Wait. Find the Taste.',
    supportLine: 'Bada Zayka, Chhoti Kimat',
    body: 'Mystery meal drops from premium restaurants near you. Curated for discovery. Pickup-only. Built for trust.',
    primaryCta: 'Join Waitlist',
    secondaryCta: 'See How It Works',
    socialProof: 'Already 340 food lovers waiting in Hyderabad',
  },
  trustPills: [
    'Premium restaurants',
    'Pickup-only',
    'Allergens disclosed',
    'Fresh, same-day food',
    'FSSAI-aware platform standards',
  ],
  howItWorks: [
    {
      title: 'Discover',
      description:
        'Find drops in your area and choose the kind of experience that fits you.',
    },
    {
      title: 'Claim',
      description:
        'Review the trust details that matter before you commit to a bag.',
    },
    {
      title: 'Pickup',
      description:
        'Collect during the pickup window and let the restaurant surprise you.',
    },
  ],
  bamBag: {
    heading: 'Premium restaurants should not feel permanently out of reach.',
    body: 'goZaika helps people discover standout restaurants through limited BAM Bag drops. You may not know exact dishes in advance, but you will know dietary type, allergen categories, pickup window, and why the experience is worth showing up for.',
    callout:
      'goZaika is a controlled-access discovery platform built for premium taste with transparent trust details.',
  },
  restaurantTeaser: {
    heading: 'Restaurant partners: recover cost, not reputation.',
    body: 'goZaika gives your team a zero-friction channel to release intentional surplus bags you design, price, and brand yourself.',
    stats: [
      '12% commission - lowest in category',
      'Zero delivery ops',
      'Your story, your brand',
    ],
    cta: 'Become a Partner',
  },
  launch: {
    heading: 'Launching soon in Hyderabad',
    body: 'Banjara Hills · Jubilee Hills · Kondapur. Be among the first to know when BAM Bags drop near you.',
    successMessage:
      "You're on the list! We'll notify you when BAM Bags are live in your area.",
  },
  partnerPreviews: [
    'The Spice Lab - Contemporary Indian · Banjara Hills · Pickup 7-9 PM · Bag value INR600+',
    'Garden Terrace - Modern Vegetarian · Jubilee Hills · Pickup 6-8 PM · Bag value INR450+',
    'The Coastal Kitchen - Seafood & Coastal · Kondapur · Pickup 7-9 PM · Bag value INR700+',
  ],
  testimonials: [
    {
      quote:
        'The pickup flow felt premium and seamless. I discovered a place I would not have tried otherwise.',
      name: 'Priya R.',
      title: 'Early Waitlist Member',
    },
    {
      quote:
        'The experience balances trust and surprise perfectly. The details shown before pickup are very useful.',
      name: 'Arjun K.',
      title: 'Food Explorer',
    },
    {
      quote:
        'As a concept, this is exactly the kind of thoughtful food discovery Hyderabad needs.',
      name: 'Nisha M.',
      title: 'Pilot Community User',
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
    },
    {
      heading: 'Buy',
      body: 'Pay once, get instant confirmation, and lock your pickup window.',
    },
    {
      heading: 'Pickup',
      body: 'Walk to the restaurant, show your QR confirmation, and collect your bag during the stated time window.',
    },
    {
      heading: 'Discover',
      body: 'Share your haul, rate the experience, and return for the next curated drop.',
    },
  ],
  allergenCallout:
    'Every listing declares all 14 major allergens before you buy.',
} as const;

export const forRestaurantsContent = {
  title: "The lowest-friction revenue channel you've never had.",
  subtitle:
    "goZaika is not a delivery app. It's a controlled-access discovery platform for restaurants that protect brand dignity.",
  valueProps: [
    'You decide what goes in each bag.',
    'You set the pickup window.',
    'We charge 12% commission during pilot.',
    'Your restaurant name stays front and center.',
    'Zero rider and delivery burden.',
  ],
  commissionRows: [
    'First 30 days - 0% commission',
    'Pilot phase - 12%',
    'Standard - 15%',
    'Volume tier - 12% at 200+ bags/month',
    'Zayka Pro SaaS - INR2,499/month (optional)',
  ],
} as const;

export const aboutContent = {
  title:
    "We built goZaika because India's best restaurants deserve a smarter exit for great food.",
  paragraphs: [
    'Every evening, kitchens across India produce more than they sell. That output deserves a trust-first path to discovery.',
    'goZaika makes that path possible through BAM Bags: chef-curated, allergen-disclosed, and pickup-ready.',
    'We are building city by city in Hyderabad with discipline, transparency, and long-term partner alignment.',
  ],
  mission: 'To build a world where great food finds great people, every evening.',
  values: [
    'Premium without pretence',
    'Restaurant dignity first',
    'Radical transparency',
    'City-by-city intentional growth',
  ],
} as const;

export const contactSubjects = [
  { value: 'general', label: 'General' },
  { value: 'restaurant', label: 'Restaurant Partnership' },
  { value: 'investor', label: 'Investor' },
  { value: 'press', label: 'Press' },
  { value: 'careers', label: 'Careers' },
] as const;
