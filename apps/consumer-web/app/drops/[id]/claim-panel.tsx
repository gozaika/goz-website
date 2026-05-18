"use client";

import { Button } from "@gozaika/ui";
import type { ApiResponse, ClaimCreationResult, PublicDropCard } from "@gozaika/types";
import { formatPaise, getDropClaimAvailability, safeErrorMessage } from "@gozaika/utils";
import { Clock, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

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
}: {
  readonly drop: PublicDropCard;
  readonly isSignedIn: boolean;
  readonly autoClaim: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const autoClaimStarted = useRef(false);
  const availability = getDropClaimAvailability(drop);
  const loginHref = `/auth/login?next=${encodeURIComponent(`/drops/${drop.dropPk}?claim=1`)}`;

  const claim = useCallback(async () => {
    setMessage("");

    if (!availability.canClaim) {
      setMessage(availability.reason);
      return;
    }

    if (!isSignedIn) {
      router.push(loginHref);
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
  }, [availability.canClaim, availability.reason, drop.dropPk, isSignedIn, loginHref, router]);

  useEffect(() => {
    if (!autoClaim || autoClaimStarted.current || pending) {
      return;
    }

    autoClaimStarted.current = true;
    void claim();
  }, [autoClaim, claim, pending]);

  return (
    <div className="mt-5 grid gap-3">
      <Button type="button" className="w-full gap-2" disabled={pending || !availability.canClaim} onClick={claim}>
        <ShieldCheck size={18} aria-hidden="true" />
        {pending ? "Holding..." : availability.canClaim ? "Hold this BAM Bag" : availability.reason}
      </Button>
      {message ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{message}</p>
      ) : null}
      <div className="rounded-lg border border-[#1A5C38]/20 bg-[#F2F8EF] p-3 text-sm text-[#2D2D2D]/75">
        <p className="flex items-start gap-2 font-semibold text-[#1A5C38]">
          <Clock className="mt-0.5 h-4 w-4" aria-hidden="true" />
          A hold reserves 1 bag for payment setup. No payment is charged in Slice 4A.
        </p>
        <p className="mt-2">
          Price shown for the next slice: <span className="font-semibold">{formatPaise(drop.pricePaise)}</span>. If the hold
          expires before payment is available, the bag returns to remaining availability.
        </p>
      </div>
    </div>
  );
}
