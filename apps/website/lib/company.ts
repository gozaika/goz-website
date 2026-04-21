export interface LeadershipRole {
  readonly title: string;
  readonly summary: string;
}

export const founderStory = {
  heading: "Let’s open the joy of great food to more people.",
  paragraphs: [
    "Growing up in India, I saw early that food is never just food. It brings families together. It carries memory, pride, generosity, and identity. Some of our deepest expressions of love happen around a shared meal.",
    "India has one of the world’s richest culinary traditions — shaped over centuries, across regions, communities, languages, and histories. Our finest kitchens are not just businesses. They are custodians of craft. They carry an art that belongs to this land and, in spirit, to all its people.",
    "I have long believed that great food should not feel reserved for a select few. In a modern India full of aspiration, creativity, and confidence, access to extraordinary food should widen, not narrow. Hospitality, at its best, is an act of inclusion. That belief is at the heart of goZaika.",
    "I want goZaika to help create a cultural shift: from food as something gated, formal, or out of reach, to food as discovery, joy, and shared possibility. A platform where more people can experience the quality, imagination, and artistry of great restaurants — and where restaurants can open their craft to future regulars, not just familiar circles.",
    "This is not only about convenience. It is about respect: respect for food, for the people who make it, and for the communities that gather around it. Food nourishes us. Shared with others, it becomes celebration.",
    "My background is in building products and platforms. I have spent decades creating technology companies, leading product and engineering teams, and taking ventures from idea to scale, including successful exits. Now I want to bring that experience to something deeply personal: using innovation to make great food more accessible, more discoverable, and more widely loved.",
    "We are starting in Hyderabad. But the vision is much larger.",
    "The joy of great food should belong to more of us."
  ],
} as const;

export const leadershipRoles: ReadonlyArray<LeadershipRole> = [
  {
    title: 'Founder',
    summary:
      'Product and technology executive with 30+ years across enterprise platforms, consumer systems, AR, and GenAI. Four-time founder. Two exits. Built globally distributed teams, raised capital, and led products from idea to scale.',
  },
  {
    title: 'CTO',
    summary:
      'Owns the technical architecture behind trust-critical workflows, partner tooling, payments, and future app experiences. The role is defined around platform resilience, speed of iteration, and disciplined systems thinking.',
  },
  {
    title: 'EVP Operations',
    summary:
      'Designs the operating model that keeps partner onboarding, city launches, support loops, and pickup verification clean as the network expands from one city to many.',
  },
  {
    title: 'SVP Product Marketing',
    summary:
      'Translates the product into clear market language for diners, restaurants, media, and investors. Owns category framing, launch narratives, and trust communication.',
  },
  {
    title: 'SVP Sales and Marketing',
    summary:
      'Builds the restaurant acquisition engine, local market partnerships, and city-level demand programs without forcing the brand into discount-led growth tactics.',
  },
  {
    title: 'Product Manager',
    summary:
      'Connects customer insight, restaurant workflow reality, and execution detail. Owns prioritization across trust systems, marketplace behavior, and operator tooling.',
  },
  {
    title: 'VP Engineering',
    summary:
      'Builds and scales the engineering organization with a bias for product quality, measurable throughput, and the kind of operational discipline a network business requires early.',
  },
] as const;

export const culturePrinciples = [
  {
    title: 'Depth before breadth',
    body: 'We would rather understand one city properly than announce ten we cannot support. The same principle applies to products, partnerships, and hiring.',
  },
  {
    title: 'Trust is a product feature',
    body: 'Allergen disclosures, partner quality, clean handoffs, and clear copy are not edge concerns. They are the product.',
  },
  {
    title: 'Operator empathy matters',
    body: 'Restaurants already run complex businesses. We design systems that reduce friction instead of exporting complexity onto the kitchen.',
  },
  {
    title: 'Taste deserves rigor',
    body: 'A premium food product should feel intelligent underneath the surface. Strategy, analytics, and execution quality are part of the guest experience even when they remain invisible.',
  },
] as const;

export const careerTracks = [
  {
    title: 'Market launch and partner success',
    body: 'For operators who understand hospitality, can work city-first, and know how to build trust with restaurants on the ground.',
  },
  {
    title: 'Product, design, and growth systems',
    body: 'For people who can turn a sharp market thesis into a precise customer product without leaning on generic marketplace patterns.',
  },
  {
    title: 'Engineering and data foundations',
    body: 'For builders who care about reliable systems, clean tooling, and fast iteration in a trust-sensitive workflow environment.',
  },
] as const;

export const careerRoleOptions = [
  'Market launch and partner success',
  'Product, design, and growth systems',
  'Engineering and data foundations',
  'Operations and city building',
  'General application',
] as const;

export const investorNarrative = {
  thesis:
    'goZaika is building a controlled-access discovery layer for premium restaurants: a category between delivery utility, discount-led acquisition, and traditional loyalty.',
  bullets: [
    'Launches in Hyderabad first because city density, premium supply, and partner quality make it the right market for proof.',
    'Solves a restaurant-side problem that current channels handle poorly: brand-safe customer acquisition without discount dilution.',
    'Uses pickup-first operations to keep unit economics cleaner and partner control stronger.',
    'Builds trust through disclosure and verification rather than trying to hide complexity behind convenience language.',
  ],
} as const;

export const companyOverview = {
  body: 'goZaika is building new market infrastructure for premium restaurant discovery in India. The company sits at the intersection of hospitality, consumer product design, and trust systems. Every page in this section is designed to answer a simple question for candidates, investors, and collaborators: how is this business being built, and why does it deserve to exist?',
} as const;
