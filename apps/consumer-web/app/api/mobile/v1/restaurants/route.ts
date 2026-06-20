import { loadPublicRestaurants } from "@/lib/restaurants";
import { mobileResponseErr, mobileResponseOk, newRequestId } from "@/lib/mobile/handler";

/** Public restaurant directory (Slice 8). Safe public fields only. */
export async function GET() {
  const requestId = newRequestId();
  try {
    return mobileResponseOk(await loadPublicRestaurants(), requestId);
  } catch {
    return mobileResponseErr("SERVER_ERROR", "Could not load restaurants right now.", requestId);
  }
}
