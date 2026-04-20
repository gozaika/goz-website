export interface LeadershipRole {
  readonly title: string;
  readonly summary: string;
}

export const founderStory = {
  heading: 'A founder who has built through multiple technology cycles',
  paragraphs: [
    'Venkat Reddy has spent more than three decades building products at the intersection of technology depth, market timing, and organizational discipline. Across enterprise software, hardware-software systems, AR, and GenAI, his career has followed a repeatable pattern: identify a category shift early, build the right product architecture around it, and scale teams that can deliver with credibility.',
    'He is a four-time founder with two successful exits, including companies acquired by Oracle and Apple. Across those ventures he has raised capital, built global product and engineering teams, and taken technically ambitious products from research through execution and strategic outcomes. That matters for goZaika because the company does not need only a storyteller or only an operator. It needs someone who can connect market thesis, product discipline, systems design, and long-horizon execution.',
    'goZaika sits inside hospitality, but its core challenge is product design under trust constraints. The platform has to work for restaurants that care about brand, for customers who care about safety, and for a market that has learned to expect discounting from digital food products. Venkat’s background makes that combination unusually legible. He has spent a career building systems where precision matters, where market education matters, and where product integrity is the difference between novelty and durable value.',
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
