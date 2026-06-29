import { ShellHeader } from "@gozaika/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadPublicRestaurant } from "@/lib/restaurants";
import { createClient } from "@/lib/supabase/server";
import { isFollowing as checkFollowing } from "@/lib/follows";
import { resolveConsumerProfilePk } from "@/lib/reviews";
import { ConsumerNavLinks } from "../../consumer-nav";
import { RestaurantDetailClient } from "./restaurant-detail-client";

async function loadInitialFollowing(restaurantPk: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const consumerPk = await resolveConsumerProfilePk(supabase, { authUserId: user.id });
  if (!consumerPk) return false;
  return checkFollowing(supabase, consumerPk, restaurantPk);
}

export const dynamic = "force-dynamic";

export default async function RestaurantProfilePage({
  params,
}: {
  readonly params: Promise<{ readonly slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await loadPublicRestaurant(slug);

  if (!restaurant) {
    notFound();
  }

  const initialFollowing = await loadInitialFollowing(restaurant.restaurantPk);

  return (
    <main>
      <ShellHeader>
        <ConsumerNavLinks />
      </ShellHeader>

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl px-4 pt-4">
        <ol className="flex items-center gap-1.5 text-xs text-[#2D2D2D]/55">
          <li><Link href="/" className="hover:text-[#1A5C38]">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/restaurants" className="hover:text-[#1A5C38]">Restaurants</Link></li>
          <li aria-hidden="true">/</li>
          <li className="font-semibold text-[#2D2D2D]">{restaurant.restaurantName}</li>
        </ol>
      </nav>

      <RestaurantDetailClient restaurant={restaurant} initialFollowing={initialFollowing} />
    </main>
  );
}
