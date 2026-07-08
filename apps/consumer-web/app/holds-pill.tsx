import type { ClaimIntent } from "@gozaika/types";
import { IST_TIME_ZONE } from "@gozaika/utils";
import { loadConsumerClaimIntents } from "@/lib/claims";
import { HoldsPillBar } from "./holds-pill-bar";

// Pure summary (kept out of the component body so the `Date.now()` read isn't an
// impure call during render). Returns null when there are no active holds.
function summarizeActiveHolds(claims: readonly ClaimIntent[]): { count: number; expiresLabel: string } | null {
  const now = Date.now();
  const active = claims.filter((claim) => claim.statusCode === "ACTIVE" && Date.parse(claim.expiresAt) > now);
  if (active.length === 0) return null;
  const earliest = active.reduce((soonest, claim) =>
    Date.parse(claim.expiresAt) < Date.parse(soonest.expiresAt) ? claim : soonest,
  );
  return {
    count: active.length,
    expiresLabel: new Date(earliest.expiresAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: IST_TIME_ZONE }),
  };
}

// Server wrapper: loads the signed-in customer's active holds (empty for
// signed-out users) and hands the summary to the client pill. Rendered once in
// the root layout so the reminder follows the customer across browsing screens.
export async function HoldsPill() {
  const claims = await loadConsumerClaimIntents().catch((): ClaimIntent[] => []);
  const summary = summarizeActiveHolds(claims);
  if (!summary) return null;
  return <HoldsPillBar count={summary.count} expiresLabel={summary.expiresLabel} />;
}
