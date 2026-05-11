import { NextResponse } from "next/server";
import type { PublicDropCard } from "@gozaika/types";

const previewDrops: PublicDropCard[] = [
  {
    dropPk: "33333333-3333-4333-8333-333333333333",
    restaurantName: "Jubilee Hearth",
    restaurantSlug: "jubilee-hearth",
    dietaryCategoryCode: "JAIN",
    allergenCodes: ["SESAME", "MUSTARD"],
    pricePaise: 39900,
    pickupStartAt: "2026-04-25T14:00:00.000Z",
    pickupEndAt: "2026-04-25T15:30:00.000Z",
    quantityTotal: 20,
    quantityAvailable: 13,
    statusCode: "ACTIVE",
  },
];

export async function GET() {
  return NextResponse.json({ ok: true, data: previewDrops });
}
