"use client";

import { Button } from "@gozaika/ui";
import type { ApiResponse, ClaimCreationResult, PublicDropCard } from "@gozaika/types";
import type { ConsumerSafetyPrefs } from "@gozaika/utils";
import {
  evaluateAllergenConflict,
  formatAllergenLabel,
  formatDietaryLabel,
  formatPaise,
  getDropClaimAvailability,
  safeErrorMessage,
} from "@gozaika/utils";
import { AlertTriangle, Clock, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function claimKey(dropPk: string) {
  return `gozaika:claim-idempotency:${dropPk}`;
}

function readOrCreateIdempotencyKey(dropPk: string) {
  const key = claimKey(dropPk);
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const next = `claim:${dropPk}:${crypto.randomUUID()}`;
  window.localStorage.setItem(key, next);
  return next;
}

export function ClaimPanel({
  drop,
  isSignedIn,
  autoClaim,
  safetyPrefs,
}: {
  readonly drop: PublicDropCard;
  readonly isSignedIn: boolean;
  readonly autoClaim: boolean;
  readonly safetyPrefs?: ConsumerSafetyPrefs;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [showConflict, setShowConflict] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const autoClaimStarted = useRef(false);
  const availability = getDropClaimAvailability(drop);
  const loginHref = `/auth/login?next=${encodeURIComponent(`/drops/${drop.dropPk}?claim=1`)}`;

  // §16 allergen-conflict gate. Warn + explicit acknowledgement (owner decision):
  // a conflict never silently blocks, but the customer must actively confirm.
  const conflict = useMemo(
    () =>
      evaluateAllergenConflict(safetyPrefs ?? { avoidAllergenCodes: [], dietaryPreferenceCodes: [] }, {
        allergenCodes: drop.allergenCodes,
        dietaryCategoryCode: drop.dietaryCategoryCode,
      }),
    [safetyPrefs, drop.allergenCodes, drop.dietaryCategoryCode],
  );

  const claim = useCallback(async (options?: { readonly bypassGate?: boolean }) => {
    setMessage("");

    if (!availability.canClaim) {
      setMessage(availability.reason);
      return;
    }

    if (!isSignedIn) {
      router.push(loginHref);
      return;
    }

    if (conflict.hasConflict && !acknowledged && !options?.bypassGate) {
      setShowConflict(true);
      return;
    }

    setPending(true);

    try {
      const idempotencyKey = readOrCreateIdempotencyKey(drop.dropPk);
      const response = await fetch("/api/claims", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dropPk: drop.dropPk, quantity: 1, idempotencyKey }),
      });
      const payload = (await response.json().catch(() => ({}))) as ApiResponse<ClaimCreationResult>;

      if (!payload.ok || !payload.data) {
        throw new Error(payload.error ?? "We could not hold this BAM Bag.");
      }

      window.localStorage.removeItem(claimKey(drop.dropPk));
      router.push(payload.data.confirmationHref);
      router.refresh();
    } catch (caught) {
      setMessage(safeErrorMessage(caught, "We could not hold this BAM Bag. Please try again."));
    } finally {
      setPending(false);
    }
  }, [availability.canClaim, availability.reason, conflict.hasConflict, acknowledged, drop.dropPk, isSignedIn, loginHref, router]);

  const acknowledgeAndClaim = useCallback(() => {
    setAcknowledged(true);
    setShowConflict(false);
    void claim({ bypassGate: true });
  }, [claim]);

  useEffect(() => {
    if (!autoClaim || autoClaimStarted.current || pending) {
      return;
    }

    autoClaimStarted.current = true;
    void claim();
  }, [autoClaim, claim, pending]);

  return (
    <div className="mt-5 grid gap-3">
      {showConflict && conflict.hasConflict ? (
        <div role="alertdialog" aria-labelledby="allergen-gate-title" className="rounded-lg border-2 border-danger bg-danger-soft p-4">
          <p id="allergen-gate-title" className="flex items-start gap-2 text-sm font-bold text-danger">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            Check this against your preferences
          </p>
          <div className="mt-2 grid gap-2 text-sm text-charcoal">
            {conflict.conflictingAllergens.length > 0 ? (
              <p>
                You&apos;ve asked us to flag{" "}
                <span className="font-semibold">
                  {conflict.conflictingAllergens.map(formatAllergenLabel).join(", ")}
                </span>
                . This bag discloses{" "}
                {conflict.conflictingAllergens.length === 1 ? "it" : "them"} in its allergens.
              </p>
            ) : null}
            {conflict.dietaryConflict ? (
              <p>
                This bag is <span className="font-semibold">{formatDietaryLabel(conflict.dietaryConflict)}</span>, which doesn&apos;t match your
                saved dietary preference.
              </p>
            ) : null}
            <p className="text-muted">
              You can still claim it — just confirm you&apos;ve checked. Update saved preferences any time in your account.
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="danger" onClick={acknowledgeAndClaim} disabled={pending}>
              Claim anyway
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowConflict(false)} disabled={pending}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
      <Button type="button" className="w-full gap-2" disabled={pending || !availability.canClaim} onClick={() => claim()}>
        <ShieldCheck size={18} aria-hidden="true" />
        {pending ? "Holding..." : availability.canClaim ? "Hold this BAM Bag" : availability.reason}
      </Button>
      {message ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{message}</p>
      ) : null}
      <div className="rounded-lg border border-forest/20 bg-success-soft p-3 text-sm text-muted">
        <p className="flex items-start gap-2 font-semibold text-forest">
          <Clock className="mt-0.5 h-4 w-4" aria-hidden="true" />
          A hold reserves 1 bag until the timer expires. Payment happens on the checkout screen.
        </p>
        <p className="mt-2">
          Listed price: <span className="font-semibold">{formatPaise(drop.pricePaise)}</span>. If the hold expires, the bag
          returns to remaining availability.
        </p>
      </div>
    </div>
  );
}
