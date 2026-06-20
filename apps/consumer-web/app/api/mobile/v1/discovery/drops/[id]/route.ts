import { loadPublicDrop } from "@/lib/drops";
import { mobileResponseErr, mobileResponseOk, newRequestId } from "@/lib/mobile/handler";

/** Public drop detail (Slice 8). No claim mutation here — that is Slice 9. */
export async function GET(_req: Request, { params }: { readonly params: Promise<{ readonly id: string }> }) {
  const requestId = newRequestId();
  const { id } = await params;
  try {
    const drop = await loadPublicDrop(id);
    if (!drop) {
      return mobileResponseErr("NOT_FOUND", "This drop is unavailable or no longer public.", requestId);
    }
    return mobileResponseOk(drop, requestId);
  } catch {
    return mobileResponseErr("SERVER_ERROR", "Could not load this drop.", requestId);
  }
}
