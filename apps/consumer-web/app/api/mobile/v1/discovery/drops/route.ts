import { loadPublicDrops } from "@/lib/drops";
import { mobileResponseErr, mobileResponseOk, newRequestId } from "@/lib/mobile/handler";

/** Public discovery list (Slice 8). No auth; bounded by the underlying view. */
export async function GET() {
  const requestId = newRequestId();
  try {
    return mobileResponseOk(await loadPublicDrops(), requestId);
  } catch {
    return mobileResponseErr("SERVER_ERROR", "Could not load drops right now.", requestId);
  }
}
