export interface CityLaunchTier {
  readonly city: string;
  readonly state: string;
  readonly tier: 'Live' | 'Wave 2' | 'Wave 3';
  readonly focusZones: string;
  readonly rationale: string;
  readonly top: string;
  readonly left: string;
}

export const cityLaunchTiers: ReadonlyArray<CityLaunchTier> = [
  {
    city: 'Hyderabad',
    state: 'Telangana',
    tier: 'Live',
    focusZones: 'Banjara Hills, Jubilee Hills, Kondapur',
    rationale: 'High premium restaurant density with neighborhoods close enough to learn quickly and build depth.',
    top: '60%',
    left: '56%',
  },
  {
    city: 'Bengaluru',
    state: 'Karnataka',
    tier: 'Wave 2',
    focusZones: 'Indiranagar, Koramangala, HSR',
    rationale: 'A natural second-wave market with strong premium consumption and digitally fluent repeat diners.',
    top: '67%',
    left: '48%',
  },
  {
    city: 'Mumbai',
    state: 'Maharashtra',
    tier: 'Wave 2',
    focusZones: 'Bandra, Lower Parel, Powai',
    rationale: 'Dense high-value inventory and a strong fit for premium discovery mechanics.',
    top: '57%',
    left: '36%',
  },
  {
    city: 'Delhi',
    state: 'Delhi',
    tier: 'Wave 3',
    focusZones: 'Khan Market, Defence Colony, GK',
    rationale: 'A future premium market that rewards brand-aware dining platforms.',
    top: '27%',
    left: '46%',
  },
  {
    city: 'Gurugram',
    state: 'Haryana',
    tier: 'Wave 3',
    focusZones: 'Golf Course Road, Cyber Hub',
    rationale: 'Strong premium office and residential clusters with high dining frequency.',
    top: '29%',
    left: '48%',
  },
  {
    city: 'Pune',
    state: 'Maharashtra',
    tier: 'Wave 3',
    focusZones: 'Koregaon Park, Baner, Kalyani Nagar',
    rationale: 'Tight premium catchments and a strong culture of repeat discovery.',
    top: '61%',
    left: '40%',
  },
  {
    city: 'Chennai',
    state: 'Tamil Nadu',
    tier: 'Wave 3',
    focusZones: 'Nungambakkam, Adyar, OMR',
    rationale: 'Underserved by premium discovery products despite strong dining depth.',
    top: '76%',
    left: '56%',
  },
  {
    city: 'Goa',
    state: 'Goa',
    tier: 'Wave 3',
    focusZones: 'Panaji, Assagao, Anjuna',
    rationale: 'Chef-driven inventory and hospitality gravity make it strategically attractive later.',
    top: '74%',
    left: '31%',
  },
  {
    city: 'Ahmedabad',
    state: 'Gujarat',
    tier: 'Wave 3',
    focusZones: 'Bodakdev, Prahlad Nagar',
    rationale: 'A large premium family and business dining opportunity.',
    top: '43%',
    left: '28%',
  },
  {
    city: 'Kolkata',
    state: 'West Bengal',
    tier: 'Wave 3',
    focusZones: 'Park Street, Ballygunge',
    rationale: 'Strong culinary identity and premium restaurant heritage.',
    top: '41%',
    left: '76%',
  },
  {
    city: 'Jaipur',
    state: 'Rajasthan',
    tier: 'Wave 3',
    focusZones: 'C-Scheme, Malviya Nagar',
    rationale: 'An emerging premium dining scene with a strong hospitality lens.',
    top: '39%',
    left: '39%',
  },
  {
    city: 'Kochi',
    state: 'Kerala',
    tier: 'Wave 3',
    focusZones: 'Panampilly Nagar, Fort Kochi',
    rationale: 'A credible future hospitality market with strong restaurant quality signals.',
    top: '86%',
    left: '46%',
  },
] as const;

export const cityTierOrder: ReadonlyArray<CityLaunchTier['tier']> = ['Live', 'Wave 2', 'Wave 3'];
