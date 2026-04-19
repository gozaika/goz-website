/**
 * @file apps/website/lib/content.ts
 * @description Locked website copy for goZaika phase-one launch.
 */

export const homeContent = {
  hero: {
    eyebrow: 'LAUNCHING IN HYDERABAD',
    headline: 'Drop the Wait. Find the Taste.',
    body: 'Chef-curated mystery meal drops from premium restaurants near you. Pickup-only, trust-led, and built for discovery.',
    helper: 'Join the waitlist · Free · No spam',
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
        'Review the trust details that matter before you commit to a bag.',
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
    heading: 'Premium restaurants should not feel permanently out of reach.',
    body: 'goZaika helps people discover standout restaurants through limited BAM Bag drops. You may not know exact dishes in advance, but you will know dietary type, allergen categories, pickup window, and why the experience is worth showing up for.',
    callout:
      'goZaika is a controlled-access discovery platform built for premium taste with transparent trust details.',
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
    heading: 'Get early access to Hyderabad drops',
    body: 'Join the waitlist to hear about launch windows, first restaurant reveals, and the first premium BAM Bag drops near you.',
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
      heading: 'Buy',
      body: 'Pay once, get instant confirmation, and lock your pickup window.',
      icon: '/images/step-buy-v2.svg',
    },
    {
      heading: 'Pickup',
      body: 'Walk to the restaurant, show your QR confirmation, and collect your bag during the stated time window.',
      icon: '/images/step-pickup-v2.svg',
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
} as const;

export const aboutContent = {
  title:
    "We built goZaika because India's best restaurants deserve a smarter exit for great food.",
  paragraphs: [
    'Every evening, kitchens across India produce more than they sell. That output deserves a trust-first path to discovery.',
    'goZaika makes that path possible through BAM Bags: chef-curated, allergen-disclosed, and pickup-ready.',
    'We are building city by city in Hyderabad with discipline, transparency, and long-term partner alignment.',
  ],
  mission: 'To build a world where great food finds great people, every single evening.',
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
