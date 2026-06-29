/**
 * Centralized TanStack Query key factory. Keeps cache keys consistent across both
 * apps and makes targeted invalidation (e.g. on realtime order/drop events) safe.
 */
export const queryKeys = {
  // Customer
  discovery: {
    drops: (filters?: Record<string, unknown>) => ["discovery", "drops", filters ?? {}] as const,
    cuisineStats: () => ["discovery", "cuisine-stats"] as const,
    drop: (dropPk: string) => ["discovery", "drop", dropPk] as const,
    adventurePick: () => ["discovery", "adventure-pick"] as const,
  },
  restaurants: {
    list: (filters?: Record<string, unknown>) => ["restaurants", "list", filters ?? {}] as const,
    detail: (slug: string) => ["restaurants", "detail", slug] as const,
    reviews: (slug: string) => ["restaurants", "reviews", slug] as const,
  },
  follows: {
    list: () => ["follows", "list"] as const,
  },
  account: {
    profile: () => ["account", "profile"] as const,
    passport: () => ["account", "passport"] as const,
    discoveryProfile: () => ["account", "discovery-profile"] as const,
    consent: () => ["account", "consent"] as const,
  },
  orders: {
    list: (cursor?: string) => ["orders", "list", cursor ?? null] as const,
    detail: (orderPk: string) => ["orders", "detail", orderPk] as const,
    pickupProof: (orderPk: string) => ["orders", "pickup-proof", orderPk] as const,
  },
  claims: {
    active: () => ["claims", "active"] as const,
    checkoutStatus: (holdPk: string) => ["claims", "checkout-status", holdPk] as const,
  },
  // Restaurant
  restaurantPortal: {
    bootstrap: () => ["portal", "bootstrap"] as const,
    dashboard: (restaurantPk: string) => ["portal", "dashboard", restaurantPk] as const,
    orders: (restaurantPk: string) => ["portal", "orders", restaurantPk] as const,
    drops: (restaurantPk: string) => ["portal", "drops", restaurantPk] as const,
    templates: (restaurantPk: string) => ["portal", "templates", restaurantPk] as const,
    finance: (restaurantPk: string) => ["portal", "finance", restaurantPk] as const,
    roi: (restaurantPk: string, range?: Record<string, unknown>) =>
      ["portal", "roi", restaurantPk, range ?? {}] as const,
    reviews: (restaurantPk: string) => ["portal", "reviews", restaurantPk] as const,
  },
} as const;
