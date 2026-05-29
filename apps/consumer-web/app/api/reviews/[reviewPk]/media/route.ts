import { NextResponse } from "next/server";

// Photo upload for reviews — reserved for a future slice.
export async function POST() {
  return NextResponse.json({ ok: false, error: "Photo upload is not yet available." }, { status: 501 });
}
