"use client";

import { RestaurantSwitcher } from "@gozaika/ui";

export interface PortalSwitcherRestaurant {
  readonly id: string;
  readonly name: string;
  readonly statusLabel?: string;
}

/**
 * Chrome RestaurantSwitcher for multi-membership OWNERs. Selecting persists the
 * choice in the `gz_portal_restaurant_pk` cookie (read server-side by
 * loadSelectedRestaurant) and reloads so the server re-renders on the chosen
 * restaurant. Rendered only when the actor has more than one active membership.
 */
export function RestaurantSwitcherIsland({
  restaurants,
  selectedId,
}: {
  readonly restaurants: readonly PortalSwitcherRestaurant[];
  readonly selectedId?: string | null;
}) {
  if (restaurants.length < 2) return null;

  function select(id: string) {
    if (id === selectedId) return;
    // 30-day, lax cookie. Server validates membership before honouring it.
    document.cookie = `gz_portal_restaurant_pk=${encodeURIComponent(id)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
    window.location.reload();
  }

  return (
    <div className="px-4 pb-2">
      <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.16em] text-muted">Restaurant</p>
      <RestaurantSwitcher restaurants={restaurants} selectedId={selectedId} onSelect={select} />
    </div>
  );
}
