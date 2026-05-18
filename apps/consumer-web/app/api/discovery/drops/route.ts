import { NextResponse } from "next/server";
import { loadPublicDrops } from "@/lib/drops";

export async function GET() {
  try {
    return NextResponse.json({ ok: true, data: await loadPublicDrops() });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not load drops right now." }, { status: 500 });
  }
}
