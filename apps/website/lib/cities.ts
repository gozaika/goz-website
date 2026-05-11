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
    top: '68.2%',
    left: '40.5%',
  },
  {
    city: 'Bengaluru',
    state: 'Karnataka',
    tier: 'Wave 2',
    focusZones: 'Indiranagar, Koramangala, HSR',
    rationale: 'A natural second-wave market with strong premium consumption and digitally fluent repeat diners.',
    top: '78.7%',
    left: '36.3%',
  },
  {
    city: 'Mumbai',
    state: 'Maharashtra',
    tier: 'Wave 2',
    focusZones: 'Bandra, Lower Parel, Powai',
    rationale: 'Dense high-value inventory and a strong fit for premium discovery mechanics.',
    top: '59.4%',
    left: '27.7%',
  },
  {
    city: 'Delhi',
    state: 'Delhi',
    tier: 'Wave 3',
    focusZones: 'Khan Market, Defence Colony, GK',
    rationale: 'A future premium market that rewards brand-aware dining platforms.',
    top: '32.2%',
    left: '35.4%',
  },
  {
    city: 'Gurugram',
    state: 'Haryana',
    tier: 'Wave 3',
    focusZones: 'Golf Course Road, Cyber Hub',
    rationale: 'Strong premium office and residential clusters with high dining frequency.',
    top: '32.4%',
    left: '34.2%',
  },
  {
    city: 'Pune',
    state: 'Maharashtra',
    tier: 'Wave 3',
    focusZones: 'Koregaon Park, Baner, Kalyani Nagar',
    rationale: 'Tight premium catchments and a strong culture of repeat discovery.',
    top: '63.4%',
    left: '31%',
  },
  {
    city: 'Chennai',
    state: 'Tamil Nadu',
    tier: 'Wave 3',
    focusZones: 'Nungambakkam, Adyar, OMR',
    rationale: 'Underserved by premium discovery products despite strong dining depth.',
    top: '78.2%',
    left: '49.9%',
  },
  {
    city: 'Goa',
    state: 'Goa',
    tier: 'Wave 3',
    focusZones: 'Panaji, Assagao, Anjuna',
    rationale: 'Chef-driven inventory and hospitality gravity make it strategically attractive later.',
    top: '72.4%',
    left: '28.9%',
  },
  {
    city: 'Ahmedabad',
    state: 'Gujarat',
    tier: 'Wave 3',
    focusZones: 'Bodakdev, Prahlad Nagar',
    rationale: 'A large premium family and business dining opportunity.',
    top: '50.4%',
    left: '25.5%',
  },
  {
    city: 'Kolkata',
    state: 'West Bengal',
    tier: 'Wave 3',
    focusZones: 'Park Street, Ballygunge',
    rationale: 'Strong culinary identity and premium restaurant heritage.',
    top: '47.2%',
    left: '57.3%',
  },
  {
    city: 'Jaipur',
    state: 'Rajasthan',
    tier: 'Wave 3',
    focusZones: 'C-Scheme, Malviya Nagar',
    rationale: 'An emerging premium dining scene with a strong hospitality lens.',
    top: '40.9%',
    left: '30.7%',
  },
  {
    city: 'Kochi',
    state: 'Kerala',
    tier: 'Wave 3',
    focusZones: 'Panampilly Nagar, Fort Kochi',
    rationale: 'A credible future hospitality market with strong restaurant quality signals.',
    top: '88.3%',
    left: '35.7%',
  },
] as const;

export const cityTierOrder: ReadonlyArray<CityLaunchTier['tier']> = ['Live', 'Wave 2', 'Wave 3'];
