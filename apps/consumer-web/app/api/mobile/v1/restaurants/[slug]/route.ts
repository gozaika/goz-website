import { loadPublicRestaurant } from "@/lib/restaurants";
import { mobileResponseErr, mobileResponseOk, newRequestId } from "@/lib/mobile/handler";

/** Public restaurant profile (Slice 8). Never exposes legal/compliance/payout/team data. */
export async function GET(_req: Request, { params }: { readonly params: Promise<{ readonly slug: string }> }) {
  const requestId = newRequestId();
  const { slug } = await params;
  try {
    const restaurant = await loadPublicRestaurant(slug);
    if (!restaurant) {
      return mobileResponseErr("NOT_FOUND", "This restaurant is unavailable.", requestId);
    }
    return mobileResponseOk(restaurant, requestId);
  } catch {
    return mobileResponseErr("SERVER_ERROR", "Could not load this restaurant.", requestId);
  }
}
