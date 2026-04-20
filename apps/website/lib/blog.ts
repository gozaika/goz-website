export interface BlogSection {
  readonly heading: string;
  readonly paragraphs: ReadonlyArray<string>;
}

export interface BlogPost {
  readonly slug: string;
  readonly title: string;
  readonly publishedOn: string;
  readonly category: 'Market Thesis' | 'Restaurant Economics' | 'Operating Systems' | 'Sustainability' | 'Hyderabad';
  readonly readingTime: string;
  readonly dek: string;
  readonly heroSummary: string;
  readonly sections: ReadonlyArray<BlogSection>;
}

export const blogPosts: ReadonlyArray<BlogPost> = [
  {
    slug: 'why-hyderabad-first',
    title: 'Why Hyderabad first? A concentration thesis for premium restaurant discovery',
    publishedOn: '2024-10-15',
    category: 'Hyderabad',
    readingTime: '8 min read',
    dek: 'Why goZaika starts in one city, one density pattern, and one restaurant behavior stack before anything else.',
    heroSummary:
      'The case for Hyderabad is not about convenience. It is about concentration: premium neighborhoods with strong evening demand, a restaurant base that cares about brand, and a market large enough to prove depth before breadth.',
    sections: [
      {
        heading: 'A city where density still behaves like a network',
        paragraphs: [
          'Most consumer marketplaces confuse city size with market readiness. We think the better question is whether a city contains a few tightly linked neighborhoods where premium supply and premium demand can find each other repeatedly. Hyderabad offers exactly that structure. Banjara Hills, Jubilee Hills, and Kondapur each have their own dining identity, but together they create a compact discovery network where kitchen quality, spending power, and repeat movement overlap.',
          'That matters because goZaika is not trying to maximize shallow top-of-funnel traffic. We are trying to build a behavior: see a chef-curated drop, trust the disclosures, claim it, collect it, and come back. That behavior compounds only when the first city is small enough to learn quickly and large enough to matter. Hyderabad gives us that balance.',
        ],
      },
      {
        heading: 'Hyderabad has a premium restaurant base with something to protect',
        paragraphs: [
          'The goZaika thesis only works if restaurant partners care deeply about brand positioning. Mid-to-high end operators in Hyderabad do. Many have spent years building identity around cuisine, service, neighborhood relevance, and repeat community. They do not want to be pushed into a discount marketplace frame. That means they are structurally underserved by platforms that can generate volume only by flattening the story into price and convenience.',
          'When we say Hyderabad first, we are also saying operator quality first. The city gives us enough independent and group-owned premium restaurants to validate whether a non-discount discovery layer can generate both partner trust and consumer demand. If that proposition fails here, it will not be rescued by expansion. If it works here, it can scale with discipline.',
        ],
      },
      {
        heading: 'The pickup-first model is easier to prove in Hyderabad',
        paragraphs: [
          'A rider-heavy market can mask product weakness. If the customer journey ends at the doorstep, it is harder to tell whether the restaurant, the story, the disclosures, or the logistics created the value. goZaika deliberately removes that ambiguity. Pickup keeps the unit economics simpler and preserves kitchen control, but it also asks more from the market. The customer must believe the experience is worth showing up for.',
          'Hyderabad has the advantage of strong local mobility patterns, growing premium residential clusters, and a dining audience already used to destination-based restaurant choice. That makes pickup a feature rather than a concession. It also allows us to test something many food platforms avoid testing directly: whether trust and curiosity can outperform discounting when the product is framed correctly.',
        ],
      },
      {
        heading: 'Depth before coverage is a strategic choice',
        paragraphs: [
          'There is a temptation, especially in early-stage consumer businesses, to announce many cities as proof of ambition. We think that is the wrong signal. A young marketplace should not promise national reach before it has earned local repeatability. Our expansion philosophy is the opposite: depth before coverage, neighborhood by neighborhood, kitchen by kitchen.',
          'Hyderabad is the first city because it gives us a market where density, quality, and premium restaurant economics all meet. If we can build a credible off-menu discovery layer here, expansion becomes a replication problem. Until then, the work is simple: earn trust in one city, with real operators and real customers, and let the next market be a consequence of proof rather than projection.',
        ],
      },
    ],
  },
  {
    slug: 'mid-premium-restaurant-cac-problem-india',
    title: 'The mid-premium restaurant CAC problem in India',
    publishedOn: '2024-12-05',
    category: 'Restaurant Economics',
    readingTime: '9 min read',
    dek: 'Why customer acquisition for independent and small-chain premium restaurants is more expensive, less compounding, and less controllable than it appears.',
    heroSummary:
      'For mid-high tier restaurants in India, CAC is not one number. It is a stack of dependencies: aggregator visibility, discount participation, influencer spending, paid social, and the quiet cost of eroded brand memory.',
    sections: [
      {
        heading: 'The real CAC problem is not spend. It is dependence.',
        paragraphs: [
          'Restaurant founders often talk about CAC as if it lives inside a paid media dashboard. In practice, the harder problem is channel dependence. When a premium restaurant relies on marketplace ranking, intermittent discount campaigns, influencer pushes, and short-cycle paid discovery, it does not really own its acquisition model. It rents demand from a system whose incentives are not aligned with long-term brand equity.',
          'That dependence is especially painful in the mid-premium band. Luxury brands may have destination pull strong enough to resist discount expectations. Mass brands may absorb lower margins in exchange for scale. But the middle to upper-middle segment often faces the worst of both worlds: enough ambition to care about perception, not enough leverage to dictate terms to distribution channels.',
        ],
      },
      {
        heading: 'Discounting lowers friction and raises long-term CAC',
        paragraphs: [
          'The short-term logic of discounting is easy to understand. A lower headline price drives trial, improves campaign conversion, and can temporarily fill empty slots. The long-term effect is harder to see because it does not show up as a single invoice. It appears as a change in customer behavior: lower willingness to pay full menu price, weaker direct recall, and growing dependence on external traffic spikes.',
          'In that sense, discounting is not just a margin event. It is a positioning event. Once a restaurant trains the market to interpret demand through offers, future acquisition becomes more expensive because each campaign has to compensate for the expectation it created. CAC rises not because media costs alone rise, but because the restaurant has made its own brand less self-propelling.',
        ],
      },
      {
        heading: 'Premium restaurants need better-intent demand, not just more demand',
        paragraphs: [
          'The right acquisition question for a premium restaurant is not “How do we get more clicks?” It is “What kind of demand enters the funnel?” A guest who comes because the restaurant was framed as a bargain behaves differently from a guest who comes because the restaurant was framed as worth discovering. The first optimizes for price. The second optimizes for experience.',
          'This is why goZaika’s model starts from framing. A BAM Bag is not designed to compete with aggregator discount mechanics. It is designed to create a controlled, high-intent entry point into a restaurant’s brand. That lowers a different kind of CAC: the cost of attracting the wrong customer, at the wrong expectation, through the wrong story.',
        ],
      },
      {
        heading: 'A better channel preserves both margin and memory',
        paragraphs: [
          'Restaurants do not need a hundred acquisition hacks. They need a handful of demand channels that reinforce brand memory instead of dissolving it. In the mid-premium category, the most valuable customer is not the one who converts once at the lowest price. It is the one who arrives with the right frame, has a strong first experience, and later returns directly.',
          'That is the strategic opening we see. If acquisition can be redesigned around trust, curation, and controlled discovery, CAC stops being purely a media problem. It becomes a product problem. And product problems, unlike discount loops, can compound in the right direction.',
        ],
      },
    ],
  },
  {
    slug: 'competitive-landscape-hyderabad-dining',
    title: 'Growth without discounting: the competitive landscape in Hyderabad dining',
    publishedOn: '2025-02-20',
    category: 'Market Thesis',
    readingTime: '8 min read',
    dek: 'A look at how premium restaurants in Hyderabad compete for attention, and why most current channels still push them toward the wrong kind of growth.',
    heroSummary:
      'Hyderabad’s premium dining market is vibrant, but the dominant digital channels still over-reward convenience, discounting, and generic list placement. That leaves a clear whitespace for trust-led discovery.',
    sections: [
      {
        heading: 'The market is stronger than the demand infrastructure around it',
        paragraphs: [
          'Hyderabad already has the raw ingredients of a premium restaurant city: strong neighborhood identities, chef-led ambition, growing affluent consumer clusters, and an audience willing to travel for a meal that feels worth the detour. But the demand infrastructure around those restaurants is still skewed toward the wrong signals.',
          'Most digital food discovery today still centers on rating stacks, delivery bias, or offer-led browsing. Those systems are useful for utility consumption. They are far less effective at expressing the value of a restaurant that wants to be remembered for identity, quality, and experience rather than transaction speed.',
        ],
      },
      {
        heading: 'The core competitive sets are misaligned',
        paragraphs: [
          'A premium restaurant in Hyderabad does not really compete only with the restaurant next door. It competes with delivery-first convenience, with attention fragmentation on social platforms, with reservation-led browsing behavior, and with aggregator pages that flatten every story into the same list architecture. The result is a customer acquisition landscape that feels busy but rarely feels brand-building.',
          'In that setting, operators are often pushed into defensive growth tactics: episodic campaigns, influencer bursts, menu engineering for visibility, or promotional participation they would never choose if they controlled the frame. These tactics are understandable. They are also a sign that the category still lacks a product designed for high-consideration restaurant discovery.',
        ],
      },
      {
        heading: 'Why controlled discovery is a useful counter-position',
        paragraphs: [
          'goZaika is not trying to replace reservation platforms, delivery, or restaurant-owned channels. The opportunity is narrower and more valuable: create a controlled-access discovery layer that helps the right guest find the right kitchen through a frame that preserves trust. The restaurant keeps the story. The customer gets transparency before purchase. The platform creates the moment of entry.',
          'This matters in Hyderabad because the city is still early enough for category-shaping behavior to emerge. Operators are not uniformly locked into one growth playbook. Consumers are still open to new trust mechanics if the product feels premium. A city in that stage can reward a new behavior pattern faster than a fully saturated market.',
        ],
      },
      {
        heading: 'The real competition is not another app. It is expectation.',
        paragraphs: [
          'The hardest competitive force in food marketplaces is not a single rival. It is the expectation that digital food demand must be either utility or discount. If goZaika works, it will be because we help both sides reject that false choice. Restaurants do not need to become bargains to become discoverable. Diners do not need to know the exact dish to know whether the experience fits them.',
          'That is the competitive bet. Hyderabad is the right city to test it because it has enough restaurant quality to matter, enough premium density to sustain it, and enough market openness to let a better frame take root.',
        ],
      },
    ],
  },
  {
    slug: 'what-serious-diners-need-before-purchase',
    title: 'What serious diners need before purchase',
    publishedOn: '2025-05-08',
    category: 'Operating Systems',
    readingTime: '7 min read',
    dek: 'The trust objects that matter before someone pays for a chef-curated surprise.',
    heroSummary:
      'Mystery works only when disclosure works. The premium customer does not need every detail before purchase, but they need the right details before payment.',
    sections: [
      {
        heading: 'Curiosity is not a substitute for trust',
        paragraphs: [
          'A surprise meal concept rises or falls on a simple question: what does the customer know before they pay? Not every diner wants the exact dish list. Many actively enjoy not knowing. But almost every serious diner wants to understand risk, fit, and effort. If those signals are absent, surprise stops feeling premium and starts feeling careless.',
          'That is why we treat pre-purchase disclosure as product design, not legal housekeeping. Every listing must answer the questions a thoughtful customer asks silently: Is this safe for me? Is this worth the trip? What kind of restaurant experience am I opting into? Can I realistically make the pickup window? If those questions are unresolved, conversion may still happen, but trust will not compound.',
        ],
      },
      {
        heading: 'The right disclosure stack is specific',
        paragraphs: [
          'At minimum, a serious diner needs allergen information, dietary category, pickup timing, and a sense of value relative to price. Beyond that, spice level, cuisine identity, collection mechanics, and quantity limits matter more than most teams assume. These are not edge-case details. They are the operating grammar of confidence.',
          'The best product experience does not drown the customer in raw fields. It organizes those fields into a trust stack. Safety first. Fit second. Logistics third. Excitement fourth. In most food products those priorities are reversed. We think that is why so many customers treat novelty with caution. Novelty without structure asks too much of the buyer.',
        ],
      },
      {
        heading: 'Verification matters because pickup is a handoff moment',
        paragraphs: [
          'The claim flow is only credible if the handoff is credible. Customers need to understand that purchase locks a pickup window and attaches a verification object to that order. That is why QR-led verification matters. It removes ambiguity for the customer and the restaurant. The diner is not arguing at a counter. The team is not improvising a lookup. The system creates a clean handoff between digital intent and physical collection.',
          'This sounds operational, but it is also emotional. The pickup moment is where trust either lands or breaks. A smooth verification flow tells the customer that the platform was designed seriously. A weak one tells them the mystery was better designed than the mechanics.',
        ],
      },
      {
        heading: 'What diners will reward over time',
        paragraphs: [
          'Customers do not stay loyal to novelty forever. They stay loyal to systems that make novelty safe, legible, and repeatable. That means the product must tell them what they will see before purchase, what they will not see, how limited the drops are, what filters exist, and how the platform will evolve. A clean line such as “app and mobile web checkout on the way” does more than inform. It signals that the product team understands where the journey is heading.',
          'The customer does not need a perfect feature matrix on day one. They do need enough operational clarity to believe that what looks elegant on the surface is just as well considered underneath.',
        ],
      },
    ],
  },
  {
    slug: 'pickup-only-operating-model',
    title: 'No riders, no brand dilution: the pickup-only operating model',
    publishedOn: '2025-08-14',
    category: 'Operating Systems',
    readingTime: '8 min read',
    dek: 'Why a pickup-first model is not a compromise for goZaika. It is the point.',
    heroSummary:
      'Pickup-only is not the absence of delivery. It is an operating choice that preserves kitchen control, simplifies unit economics, and protects the restaurant’s experience at the exact moment the brand is most vulnerable.',
    sections: [
      {
        heading: 'The handoff is part of the product',
        paragraphs: [
          'In delivery-first systems, the restaurant loses control at the most sensitive moment in the customer journey: the handoff. Packaging quality, rider timing, route volatility, and last-mile friction become part of the meal experience even when the restaurant did everything right. That makes delivery convenient for the customer, but it also blurs accountability in ways premium restaurants understandably dislike.',
          'goZaika’s pickup-first model refuses that trade. The restaurant prepares the bag, the customer arrives during a declared window, verification happens quickly, and the handoff stays under kitchen control. That does not solve every operational issue, but it does solve a crucial one: the restaurant can stand behind the experience without apologizing for logistics it never truly owned.',
        ],
      },
      {
        heading: 'Pickup simplifies the economics without cheapening the brand',
        paragraphs: [
          'A riderless model removes an entire cost and coordination layer from the system. There is no delivery routing logic, no variable rider supply, no radius optimization, and no last-mile quality drift. That makes the economics easier to understand for both platform and partner. More importantly, it keeps the product from drifting toward convenience-first sameness.',
          'Premium restaurants do not win by pretending to be the fastest possible utility service. They win when the guest believes the experience justifies the trip. Pickup aligns naturally with that proposition. It turns the claim into a deliberate act rather than a low-attention transaction.',
        ],
      },
      {
        heading: 'Operationally, fewer moving parts means fewer brand failures',
        paragraphs: [
          'Every extra operational dependency is another opportunity for a customer to blame the wrong party for the wrong reason. With pickup, the operational chain is shorter and clearer. The restaurant owns curation and handoff. The platform owns discovery, disclosure, payment, and verification. The customer owns arriving within the agreed window. That distribution of responsibility is cleaner than what most restaurant technology stacks currently offer.',
          'For operators, that clarity matters. So does the absence of packaging SLAs designed around transit, the removal of rider coordination overhead, and the ability to train front-of-house teams on one consistent verification flow rather than multiple exception paths.',
        ],
      },
      {
        heading: 'Why this matters strategically',
        paragraphs: [
          'Pickup-only narrows the addressable behavior today, but it improves product integrity. That is a trade we are willing to make. We would rather prove a smaller, cleaner model that premium restaurants trust than inflate early demand by inheriting the fragility of delivery operations.',
          'The larger strategic point is this: not every food platform should solve the same job. Delivery owns convenience. goZaika should own controlled discovery. Pickup is the operating model that keeps those jobs distinct and keeps the restaurant experience from being diluted by the machinery around it.',
        ],
      },
    ],
  },
  {
    slug: 'restaurant-food-wastage-sustainability-analysis',
    title: 'Restaurant food wastage in India: a quantitative and qualitative sustainability analysis',
    publishedOn: '2025-11-27',
    category: 'Sustainability',
    readingTime: '11 min read',
    dek: 'A structured analysis of where restaurant food wastage comes from, why it persists, and what a brand-safe recirculation channel could change.',
    heroSummary:
      'Restaurant food wastage is usually discussed as either a moral issue or an operational issue. In reality it is both, with a third layer on top: brand risk. Any durable solution has to address all three at once.',
    sections: [
      {
        heading: 'The problem is not one bucket called “waste”',
        paragraphs: [
          'Food wastage in restaurants is often spoken about in one undifferentiated category, but operators know it is more complicated. There is preparation loss, forecasting error, overproduction against uncertain demand, partially usable inventory, and service-window mismatch. Some waste is structural. Some is avoidable. Some is the cost of maintaining quality. The strategic mistake is to treat every category the same.',
          'That matters because the sustainability conversation often collapses these realities into a simple imperative: reduce waste. But kitchens are not warehouses, and premium restaurants are not commodity distributors. They operate under reputation constraints, safety standards, menu integrity, and service expectations that make crude “save everything” narratives unrealistic.',
        ],
      },
      {
        heading: 'Why the economics and the emissions point in the same direction',
        paragraphs: [
          'Even without forcing precision where operators rarely track it consistently, the direction of the math is clear. Wasted prepared food is not just ingredient loss. It carries labor, energy, space, and planning costs with it. In premium kitchens, those embedded costs are often more meaningful than raw input cost alone. A dish that was safely prepared but not sold is not a small miss. It is a compound economic leak.',
          'The sustainability side follows the same logic. When carefully prepared food goes unused, the environmental burden of producing, transporting, storing, and cooking it has already been incurred. The emissions are upstream. The water use is upstream. The labor intensity is upstream. Throwing away prepared food does not just discard the item. It discards all the embedded inputs that produced it.',
        ],
      },
      {
        heading: 'Why operators resist existing “solutions”',
        paragraphs: [
          'From the outside, it can seem irrational that more restaurants do not embrace generic recirculation channels. From the inside, the answer is obvious. Most existing narratives ask the restaurant to accept one or more brand compromises: being framed as a discount outlet, being framed as a waste stream, or being forced into operational models that feel disconnected from the restaurant’s actual guest promise.',
          'That is why a serious sustainability solution for premium restaurants cannot begin with guilt. It has to begin with dignity. The operator must retain control over what is released, how it is described, what is disclosed, and who it is intended for. If the product turns the restaurant into a “clearance rack” in the eyes of the customer, the channel will never become strategic no matter how noble the external rhetoric sounds.',
        ],
      },
      {
        heading: 'What a brand-safe recirculation layer can do',
        paragraphs: [
          'A product like goZaika is interesting because it reframes the problem. Instead of asking the restaurant to “move surplus,” it asks the restaurant to design a chef-curated off-menu drop on its own terms. That distinction is not cosmetic. It changes incentives. The restaurant is no longer managing disposal optics. It is creating a controlled discovery moment. The customer is no longer buying leftovers. They are claiming a curated, disclosed, time-bound experience.',
          'If that framing works, the sustainability benefit becomes a consequence of a better market design rather than the sole emotional appeal. That is the more durable path. Operators adopt it because it protects brand and recovers value. Customers adopt it because it feels thoughtful, not compromised. Sustainability improves because a previously fragile inventory moment is now connected to willing demand through a cleaner story.',
        ],
      },
      {
        heading: 'The right metric is not total rescue. It is quality-preserving recirculation.',
        paragraphs: [
          'The restaurant industry will not solve food wastage by pretending all prepared food should always be redistributed. The useful goal is narrower and more operationally honest: increase the share of safe, high-quality prepared output that finds an appropriate customer without damaging the restaurant’s brand or lowering food safety standards.',
          'That may sound less dramatic than the broadest waste-reduction slogans. It is also more likely to work. And in sustainability systems, practical adoption matters more than rhetorical purity.',
        ],
      },
    ],
  },
  {
    slug: 'off-menu-discovery-layer',
    title: 'The off-menu discovery layer',
    publishedOn: '2026-02-18',
    category: 'Market Thesis',
    readingTime: '8 min read',
    dek: 'Why India’s food ecosystem needs a category between discounting, delivery utility, and loyalty.',
    heroSummary:
      'The strongest category opportunities often look small at first because they solve a problem the existing market vocabulary cannot describe well. We think off-menu discovery is one of those opportunities.',
    sections: [
      {
        heading: 'Current food products solve adjacent jobs, not this one',
        paragraphs: [
          'Delivery solves convenience. Reservation products solve planning. Marketplace discovery solves broad browsing. Loyalty products solve retention after a relationship already exists. None of these products is really designed for the moment we care about: a customer willing to discover a premium restaurant through a controlled, trust-rich, time-bound experience that the restaurant itself can stand behind.',
          'That gap matters because many premium restaurants have shaped identities that should travel beyond their core regulars, but the current digital tools for doing so either flatten the experience or make the brand pay for the privilege through discounting. There is no clean product layer for discovery that preserves mystery while increasing trust.',
        ],
      },
      {
        heading: 'Off-menu is a useful frame because it preserves intrigue',
        paragraphs: [
          'The term “off-menu” matters because it signals intentionality. It says the experience is not a generic menu purchase and not an accidental by-product either. It is a curated release. That framing gives the restaurant room to protect identity and gives the customer room to feel curiosity without confusion.',
          'Mystery only works when the platform is disciplined about what remains mysterious and what does not. Dishes can stay undisclosed. Allergens cannot. The exact selection can stay undisclosed. Pickup mechanics cannot. The restaurant can preserve surprise only because the system is rigorous about everything else.',
        ],
      },
      {
        heading: 'A better category sits between acquisition and retention',
        paragraphs: [
          'goZaika’s opportunity is not to replace the restaurant’s direct channel. It is to become a better bridge into it. A BAM Bag should introduce a customer to a restaurant in a way that respects the brand more than traditional discount-led trial. If the experience is strong, the customer can return through the restaurant’s normal menu, reservation, or direct ordering paths later.',
          'That makes the off-menu discovery layer especially attractive in India’s premium restaurant segment, where the first trial matters disproportionately. A poorly framed first interaction can cheapen the brand. A carefully framed first interaction can create not just one transaction, but a long-term relationship.',
        ],
      },
      {
        heading: 'Why this can become a real category',
        paragraphs: [
          'New categories become real when they create language for a problem both sides already feel. Restaurants already know they need better-intent demand. Customers already know they want discovery without uncertainty on safety and fit. The market simply lacks a product that names that middle ground clearly enough.',
          'Our view is that off-menu discovery can become that category. Not by being louder than delivery and not by imitating discount marketplaces, but by being more precise about the job it serves. Precision is often what makes a narrow category scalable. It earns trust first, and scale later.',
        ],
      },
    ],
  },
] as const;

export function getAllBlogPosts(): ReadonlyArray<BlogPost> {
  return [...blogPosts].sort((left, right) => right.publishedOn.localeCompare(left.publishedOn));
}

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}
