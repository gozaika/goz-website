import type { MobileMeDto } from "@gozaika/types";
import { mobileResponseOk, withMobileAuth } from "@/lib/mobile/handler";

/** Authenticated identity for the restaurant surface (shared spec §5.2). */
export const GET = withMobileAuth(({ actor, requestId }) => {
  const data: MobileMeDto = { actor, surface: "gozaika-restaurant" };
  return mobileResponseOk(data, requestId);
});
