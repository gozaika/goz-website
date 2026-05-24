"use client";

import { Button } from "@gozaika/ui";
import type { ApiResponse, OrderIncidentSummary } from "@gozaika/types";
import { safeErrorMessage } from "@gozaika/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";

const incidentTypes = [
  "DIETARY_MISMATCH",
  "FOOD_SAFETY",
  "PACKAGING_BREACH",
  "PICKUP_NOT_HONORED",
  "MISSING_ORDER",
  "QUALITY_ISSUE",
  "PLATFORM_ERROR",
] as const;

export function AdminIncidentForm({ orderPk }: { readonly orderPk: string }) {
  const router = useRouter();
  const [typeCode, setTypeCode] = useState<(typeof incidentTypes)[number]>("PLATFORM_ERROR");
  const [severityCode, setSeverityCode] = useState("P3");
  const [descriptionText, setDescriptionText] = useState("");
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setStatus("");
    try {
      const response = await fetch(`/api/admin/orders/${orderPk}/incidents`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ typeCode, severityCode, descriptionText }),
      });
      const payload = (await response.json().catch(() => ({}))) as ApiResponse<OrderIncidentSummary>;
      if (!payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Could not create incident.");
      }
      setStatus(`Incident created: ${payload.data.typeName}.`);
      setDescriptionText("");
      router.refresh();
    } catch (caught) {
      setStatus(safeErrorMessage(caught, "Could not create incident."));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-black/10 bg-black/[0.02] p-3">
      <p className="text-sm font-semibold text-black">Create support incident</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_120px]">
        <select className="min-h-10 rounded-md border border-black/15 px-2 text-xs" value={typeCode} onChange={(event) => setTypeCode(event.target.value as (typeof incidentTypes)[number])}>
          {incidentTypes.map((type) => (
            <option key={type} value={type}>{type.replaceAll("_", " ")}</option>
          ))}
        </select>
        <select className="min-h-10 rounded-md border border-black/15 px-2 text-xs" value={severityCode} onChange={(event) => setSeverityCode(event.target.value)}>
          <option value="P1">P1</option>
          <option value="P2">P2</option>
          <option value="P3">P3</option>
          <option value="P4">P4</option>
        </select>
      </div>
      <textarea
        className="mt-2 min-h-16 w-full rounded-md border border-black/15 px-2 py-2 text-xs"
        value={descriptionText}
        onChange={(event) => setDescriptionText(event.target.value)}
        placeholder="Short support note. Food safety and dietary mismatch should be escalated immediately."
      />
      <Button type="button" className="mt-2 min-h-10 w-full bg-[#1A5C38] text-xs hover:bg-[#154b2e]" disabled={pending || descriptionText.trim().length < 10} onClick={submit}>
        {pending ? "Creating..." : "Create incident"}
      </Button>
      {status ? <p className="mt-2 text-xs font-medium text-[#1A5C38]">{status}</p> : null}
    </div>
  );
}
