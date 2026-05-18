"use client";

import { Button } from "@gozaika/ui";
import { safeErrorMessage } from "@gozaika/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReviewActions({
  restaurantPk,
  documentPk,
  complianceMode = false,
}: {
  readonly restaurantPk: string;
  readonly documentPk?: string;
  readonly complianceMode?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  async function post(url: string, body: Record<string, unknown>) {
    setBusy(url);
    setError("");
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => ({ ok: false, error: "Action failed." }))) as {
        ok: boolean;
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Action failed.");
        return;
      }
      router.refresh();
    } catch (caught) {
      setError(safeErrorMessage(caught, "Action failed. Please try again."));
    } finally {
      setBusy("");
    }
  }

  if (complianceMode) {
    return (
      <div className="mt-5 grid gap-3">
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <textarea className="min-h-24 rounded-lg border border-black/20 px-3 py-2 text-sm" placeholder="Rejection reason" value={reason} onChange={(event) => setReason(event.target.value)} />
        <Button type="button" disabled={Boolean(busy)} onClick={() => post(`/api/admin/restaurants/${restaurantPk}/compliance/review`, { statusCode: "APPROVED" })}>
          Approve compliance
        </Button>
        <Button type="button" className="bg-red-700 hover:bg-red-800" disabled={Boolean(busy)} onClick={() => post(`/api/admin/restaurants/${restaurantPk}/compliance/review`, { statusCode: "REJECTED", rejectionReason: reason })}>
          Reject compliance
        </Button>
        <Button type="button" className="bg-[#1A5C38] hover:bg-[#154b2e]" disabled={Boolean(busy)} onClick={() => post(`/api/admin/restaurants/${restaurantPk}/activate`, {})}>
          Activate restaurant
        </Button>
      </div>
    );
  }

  if (!documentPk) return null;

  return (
    <div className="grid min-w-52 gap-2">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <input className="min-h-11 rounded-lg border border-black/20 px-3 text-sm" placeholder="Reason if rejected" value={reason} onChange={(event) => setReason(event.target.value)} />
      <div className="flex gap-2">
        <Button type="button" className="flex-1 bg-[#1A5C38] hover:bg-[#154b2e]" disabled={Boolean(busy)} onClick={() => post(`/api/admin/restaurants/${restaurantPk}/documents/${documentPk}/review`, { statusCode: "APPROVED" })}>
          Approve
        </Button>
        <Button type="button" className="flex-1 bg-red-700 hover:bg-red-800" disabled={Boolean(busy)} onClick={() => post(`/api/admin/restaurants/${restaurantPk}/documents/${documentPk}/review`, { statusCode: "REJECTED", rejectionReason: reason })}>
          Reject
        </Button>
      </div>
    </div>
  );
}
