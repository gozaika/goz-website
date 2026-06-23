import { NextResponse } from "next/server";
import { buildPassportPayload, getConsumerPkByUserId } from "@/lib/passport";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." }, { status: 401 });
  }

  const consumerPk = await getConsumerPkByUserId(supabase, user.id);
  if (!consumerPk) {
    return NextResponse.json({ ok: false, error: "Consumer profile not found." }, { status: 404 });
  }

  const payload = await buildPassportPayload(supabase, consumerPk);
  return NextResponse.json({ ok: true, data: payload });
}
