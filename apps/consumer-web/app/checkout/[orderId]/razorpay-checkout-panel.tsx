"use client";

import { Button } from "@gozaika/ui";
import type { ApiResponse, CheckoutStatus, RazorpayCheckoutPayload } from "@gozaika/types";
import { formatPaise, safeErrorMessage } from "@gozaika/utils";
import { CreditCard, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function checkoutKey(holdPk: string) {
  return `gozaika:checkout-idempotency:${holdPk}`;
}

function readOrCreateIdempotencyKey(holdPk: string) {
  const existing = window.localStorage.getItem(checkoutKey(holdPk));
  if (existing) return existing;

  const next = `checkout:${holdPk}:${crypto.randomUUID()}`;
  window.localStorage.setItem(checkoutKey(holdPk), next);
  return next;
}

function loadRazorpayScript() {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      if (window.Razorpay) resolve();
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Could not load Razorpay checkout.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Razorpay checkout."));
    document.body.appendChild(script);
  });
}

export function RazorpayCheckoutPanel({
  holdPk,
  expiresAt,
  amountPaise,
  disabledReason,
}: {
  readonly holdPk: string;
  readonly expiresAt: string;
  readonly amountPaise: number;
  readonly disabledReason?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState("");
  const [expired, setExpired] = useState(() => {
    const expiry = Date.parse(expiresAt);
    return Number.isFinite(expiry) && expiry <= Date.now();
  });
  const pollTimer = useRef<number | null>(null);

  async function checkStatus(): Promise<CheckoutStatus | null> {
    const response = await fetch(`/api/checkout/status?holdPk=${encodeURIComponent(holdPk)}`, { cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as ApiResponse<CheckoutStatus>;
    if (!payload.ok || !payload.data) {
      throw new Error(payload.error ?? "Could not check payment confirmation yet.");
    }
    if (payload.data.orderHref && ["PAID", "CONFIRMED", "READY_FOR_PICKUP"].includes(payload.data.orderStatusCode ?? "")) {
      window.localStorage.removeItem(checkoutKey(holdPk));
      router.replace(payload.data.orderHref);
      router.refresh();
      return payload.data;
    }
    return payload.data;
  }

  function startPolling() {
    setConfirming(true);
    setMessage("Razorpay returned. Waiting for secure payment confirmation from the server.");
    let attempts = 0;
    if (pollTimer.current) window.clearInterval(pollTimer.current);
    pollTimer.current = window.setInterval(() => {
      attempts += 1;
      void checkStatus()
        .then((status) => {
          if (status?.paymentIntentStatusCode === "FAILED") {
            setConfirming(false);
            setMessage("Payment failed or was not captured. You can retry while the hold is active.");
            if (pollTimer.current) window.clearInterval(pollTimer.current);
          }
          if (attempts >= 12) {
            setConfirming(false);
            setMessage("Payment is still pending confirmation. Refresh in a moment or retry if the hold is still active.");
            if (pollTimer.current) window.clearInterval(pollTimer.current);
          }
        })
        .catch((caught) => {
          setMessage(safeErrorMessage(caught, "Could not confirm payment yet."));
        });
    }, 5000);
  }

  useEffect(() => {
    const expiry = Date.parse(expiresAt);
    const expiryTimer = window.setInterval(() => {
      setExpired(Number.isFinite(expiry) && expiry <= Date.now());
    }, 1000);

    return () => {
      if (pollTimer.current) window.clearInterval(pollTimer.current);
      window.clearInterval(expiryTimer);
    };
  }, [expiresAt]);

  async function proceedToPayment() {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/checkout/razorpay-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ holdPk, idempotencyKey: readOrCreateIdempotencyKey(holdPk) }),
      });
      const payload = (await response.json().catch(() => ({}))) as ApiResponse<RazorpayCheckoutPayload>;
      if (!payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Could not start payment.");
      }
      if (payload.data.orderHref) {
        router.replace(payload.data.orderHref);
        return;
      }

      await loadRazorpayScript();
      if (!window.Razorpay) {
        throw new Error("Razorpay checkout is not available yet.");
      }

      const checkout = new window.Razorpay({
        key: payload.data.keyId,
        amount: payload.data.amountPaise,
        currency: payload.data.currencyCode,
        name: "goZaika",
        description: payload.data.description,
        order_id: payload.data.providerOrderRef,
        prefill: payload.data.prefill,
        theme: { color: "#FF6B35" },
        handler: () => {
          startPolling();
        },
        modal: {
          ondismiss: () => {
            setMessage("Payment was dismissed. Your hold can still be paid until the timer expires.");
          },
        },
      });
      checkout.open();
    } catch (caught) {
      setMessage(safeErrorMessage(caught, "Could not start Razorpay checkout."));
    } finally {
      setBusy(false);
    }
  }

  async function refreshStatus() {
    setBusy(true);
    setMessage("");
    try {
      const status = await checkStatus();
      if (!status?.orderHref) {
        setMessage("No confirmed paid order yet. If you just paid, the webhook may still be processing.");
      }
    } catch (caught) {
      setMessage(safeErrorMessage(caught, "Could not refresh payment status."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 grid gap-3">
      <Button type="button" className="w-full gap-2" disabled={busy || confirming || expired || Boolean(disabledReason)} onClick={proceedToPayment}>
        <CreditCard size={18} aria-hidden="true" />
        {busy ? "Preparing..." : confirming ? "Confirming payment..." : "Proceed to payment"}
      </Button>
      <button
        type="button"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#1A5C38]/25 px-4 text-sm font-semibold text-[#1A5C38]"
        disabled={busy}
        onClick={refreshStatus}
      >
        <RefreshCw size={16} aria-hidden="true" />
        Refresh payment status
      </button>
      <div className="rounded-lg border border-[#1A5C38]/20 bg-[#F2F8EF] p-3 text-sm text-[#2D2D2D]/75">
        <p>
          Pay <span className="font-semibold text-[#2D2D2D]">{formatPaise(amountPaise)}</span> through Razorpay. We confirm
          the order only after the verified Razorpay webhook is processed.
        </p>
        {disabledReason ? <p className="mt-2 font-semibold text-red-700">{disabledReason}</p> : null}
        {expired ? (
          <p className="mt-2 font-semibold text-red-700">This hold has expired. Return to the drop to create a new hold.</p>
        ) : null}
      </div>
      {message ? (
        <p className="rounded-lg border border-[#D4A017]/40 bg-white px-3 py-2 text-sm font-medium text-[#2D2D2D]">
          {message}
        </p>
      ) : null}
    </div>
  );
}
