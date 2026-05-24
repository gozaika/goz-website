"use client";

import { DropCard, DropShareActions, EmptyState } from "@gozaika/ui";
import type { PublicDropCard } from "@gozaika/types";
import { createPublicDropUrl, generateManualDropAlertText } from "@gozaika/utils";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type DropInventoryPayload = {
  readonly drop_drop_pk?: string;
  readonly computed_quantity_available?: number;
  readonly drop_status_code?: PublicDropCard["statusCode"];
};

export function DropDiscoveryClient({
  generatedAt,
  initialDrops,
}: {
  readonly generatedAt: string;
  readonly initialDrops: readonly PublicDropCard[];
}) {
  const [drops, setDrops] = useState<PublicDropCard[]>([...initialDrops]);
  const generatedAtMs = useMemo(() => Date.parse(generatedAt), [generatedAt]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("public-drop-inventory")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "drop_drop" },
        (payload) => {
          const next = payload.new as DropInventoryPayload;
          if (!next.drop_drop_pk) return;

          setDrops((current) =>
            current.map((drop) =>
              drop.dropPk === next.drop_drop_pk
                ? {
                    ...drop,
                    quantityAvailable: next.computed_quantity_available ?? drop.quantityAvailable,
                    statusCode: next.drop_status_code ?? drop.statusCode,
                  }
                : drop,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const groupedDrops = useMemo(() => {
    const sorted = [...drops].sort((a, b) => Date.parse(b.pickupStartAt) - Date.parse(a.pickupStartAt));
    return {
      current: sorted.filter((drop) => Date.parse(drop.pickupEndAt) > generatedAtMs),
      missed: sorted.filter((drop) => Date.parse(drop.pickupEndAt) <= generatedAtMs),
    };
  }, [drops, generatedAtMs]);

  if (groupedDrops.current.length === 0 && groupedDrops.missed.length === 0) {
    return (
      <EmptyState
        title="No Hyderabad drops are live yet"
        body="Approved restaurant partners will appear here as soon as their first BAM Bags are published."
      />
    );
  }

  return (
    <div className="grid gap-8">
      <section>
        {groupedDrops.current.length === 0 ? (
          <EmptyState title="No claimable drops right now" body="Recent closed drops are below. New active drops appear here first." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {groupedDrops.current.map((drop) => (
              <DropCard
                key={drop.dropPk}
                drop={drop}
                actions={
                  <DropShareActions
                    publicUrl={createPublicDropUrl(drop.dropPk)}
                    shareText={generateManualDropAlertText(drop)}
                    className="justify-end"
                  />
                }
              />
            ))}
          </div>
        )}
      </section>

      {groupedDrops.missed.length ? (
        <section>
          <div className="mb-3">
            <h2 className="text-2xl font-bold text-[#2D2D2D]">What you missed</h2>
            <p className="mt-1 text-sm text-[#2D2D2D]/65">Pickup windows that have closed are read-only and kept separate from active holds.</p>
          </div>
          <div className="grid gap-4 opacity-80 md:grid-cols-2 xl:grid-cols-3">
            {groupedDrops.missed.map((drop) => (
              <DropCard key={drop.dropPk} drop={drop} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
