import { NextResponse } from "next/server";
import { createDropDraftSchema } from "@gozaika/types";

export async function POST(request: Request) {
  const parsed = createDropDraftSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Review the drop details and try again." }, { status: 400 });
  }

  // TODO/HUMAN_REVIEW: Enforce restaurant membership scopes before writing drop_drop.
  return NextResponse.json({ ok: true, data: { statusCode: "DRAFT", ...parsed.data } }, { status: 202 });
}
