import type { MobileHealthDto } from "@gozaika/types";
import { mobileResponseOk, newRequestId } from "@/lib/mobile/handler";

/** Public health/config endpoint — no auth (shared spec §5.2). */
export async function GET() {
  const requestId = newRequestId();
  const serverTime = new Date().toISOString();
  const data: MobileHealthDto = {
    status: "ok",
    schemaVersion: 1,
    minSupportedSchemaVersion: 1,
    serverTime,
  };
  return mobileResponseOk(data, requestId, serverTime);
}
