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

export function DropDiscoveryClient({ initialDrops }: { readonly initialDrops: readonly PublicDropCard[] }) {
  const [drops, setDrops] = useState<PublicDropCard[]>([...initialDrops]);

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

  const sortedDrops = useMemo(
    () => [...drops].sort((a, b) => Date.parse(a.pickupStartAt) - Date.parse(b.pickupStartAt)),
    [drops],
  );

  if (sortedDrops.length === 0) {
    return (
      <EmptyState
        title="No Hyderabad drops are live yet"
        body="Approved restaurant partners will appear here as soon as their first BAM Bags are published."
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {sortedDrops.map((drop) => (
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
  );
}
