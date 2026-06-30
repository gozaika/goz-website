"use client";

import { Badge, DataTable, FilterChipRow, SellThroughBar, type StatusTone } from "@gozaika/ui";
import { palette } from "@gozaika/design-tokens";
import type { DropStatusCode, PortalDrop } from "@gozaika/types";
import { formatBasisPoints, formatPaise, formatPickupWindow, rateToBasisPoints } from "@gozaika/utils";
import { useMemo, useState } from "react";

type DropFilter = "all" | "active" | "scheduled" | "paused" | "closed";

const CLOSED_STATUSES: ReadonlySet<string> = new Set(["SOLD_OUT", "PICKUP_CLOSED", "EMERGENCY_CLOSED", "CANCELLED", "DRAFT"]);

function statusTone(status: DropStatusCode | string): StatusTone {
  if (status === "ACTIVE" || status === "SOLD_OUT") return "success";
  if (status === "SCHEDULED") return "info";
  if (status === "PAUSED") return "warning";
  if (status === "EMERGENCY_CLOSED" || status === "CANCELLED") return "danger";
  return "neutral";
}

function inFilter(status: string, filter: DropFilter): boolean {
  if (filter === "all") return true;
  if (filter === "active") return status === "ACTIVE";
  if (filter === "scheduled") return status === "SCHEDULED";
  if (filter === "paused") return status === "PAUSED";
  return CLOSED_STATUSES.has(status);
}

export function DropsListClient({ drops }: { readonly drops: readonly PortalDrop[] }) {
  const [filter, setFilter] = useState<DropFilter>("all");

  const totals = useMemo(() => {
    const listed = drops.reduce((sum, drop) => sum + drop.quantityTotal, 0);
    const available = drops.reduce((sum, drop) => sum + drop.quantityAvailable, 0);
    const reserved = drops.reduce((sum, drop) => sum + drop.quantityHeld, 0);
    const claimed = Math.max(0, listed - available);
    return {
      listed,
      reserved,
      claimed,
      active: drops.filter((drop) => drop.statusCode === "ACTIVE").length,
      scheduled: drops.filter((drop) => drop.statusCode === "SCHEDULED").length,
      paused: drops.filter((drop) => drop.statusCode === "PAUSED").length,
      closed: drops.filter((drop) => CLOSED_STATUSES.has(drop.statusCode)).length,
    };
  }, [drops]);

  const visible = useMemo(() => drops.filter((drop) => inFilter(drop.statusCode, filter)), [drops, filter]);

  const filterChips = [
    { id: "all", label: `All (${drops.length})` },
    { id: "active", label: `Active (${totals.active})` },
    { id: "scheduled", label: `Scheduled (${totals.scheduled})` },
    { id: "paused", label: `Paused (${totals.paused})` },
    { id: "closed", label: `Closed (${totals.closed})` },
  ];

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <DataTable
          title="At a glance"
          rows={[
            { label: "Active drops", value: `${totals.active}`, helper: `${totals.scheduled} scheduled · ${totals.paused} paused`, tone: totals.active > 0 ? "success" : "neutral" },
            { label: "Bags listed", value: `${totals.listed}` },
            { label: "Reserved (held)", value: `${totals.reserved}`, helper: "Active holds not yet collected" },
            { label: "Claimed", value: `${totals.claimed}`, helper: "Reserved + collected across all drops" },
          ]}
        />
        <div className="flex flex-col justify-center gap-3 rounded-lg border border-hairline bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-charcoal">Overall sell-through</p>
          <SellThroughBar sold={totals.claimed} total={totals.listed} label="Claimed of listed" />
          <p className="text-xs text-muted">Claimed = listed − available, across every drop in this view&apos;s source data.</p>
        </div>
      </div>

      <FilterChipRow
        ariaLabel="Drop status filters"
        accent={palette.forest}
        chips={filterChips.map((chip) => ({ ...chip, selected: filter === chip.id }))}
        onSelect={(id) => setFilter(id as DropFilter)}
      />

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-hairline bg-white p-8 text-center text-sm text-muted">
          {drops.length === 0
            ? "No drops yet. Create a BAM Bag template, then publish your first Limited Drop."
            : "No drops in this status."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-hairline bg-white shadow-sm">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-hairline bg-cream text-xs uppercase text-charcoal/55">
              <tr>
                <th className="px-4 py-3">Drop</th>
                <th className="px-4 py-3">Pickup</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Listed</th>
                <th className="px-4 py-3 text-right">Reserved</th>
                <th className="px-4 py-3">Sell-through</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((drop) => {
                const claimed = Math.max(0, drop.quantityTotal - drop.quantityAvailable);
                return (
                  <tr key={drop.dropPk} className="border-b border-hairline/60">
                    <td className="px-4 py-3 font-semibold text-charcoal">{drop.dropTitle}</td>
                    <td className="px-4 py-3 text-charcoal/75">{formatPickupWindow(drop.pickupStartAt, drop.pickupEndAt)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-charcoal">{formatPaise(drop.pricePaise)}</td>
                    <td className="px-4 py-3 text-right text-charcoal/75">{drop.quantityTotal}</td>
                    <td className="px-4 py-3 text-right text-charcoal/75">{drop.quantityHeld}</td>
                    <td className="px-4 py-3">
                      <SellThroughBar
                        className="min-w-[160px]"
                        sold={claimed}
                        total={drop.quantityTotal}
                        label={`${formatBasisPoints(rateToBasisPoints(claimed, drop.quantityTotal))} claimed`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(drop.statusCode)}>{drop.statusCode.replaceAll("_", " ")}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-3">
                        <a className="font-semibold text-forest hover:underline" href="/portal/drops/new">
                          Manage
                        </a>
                        <a className="font-semibold text-forest hover:underline" href={`/portal/drops/new?duplicate=${drop.dropPk}`}>
                          Duplicate
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
