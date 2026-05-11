import { consentPurposeCodes } from "@gozaika/types";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("privacy_consent_purpose")
    .select("purpose_code,purpose_name,description,is_required_for_service,display_order")
    .in("purpose_code", [...consentPurposeCodes])
    .order("display_order", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: "Consent purposes are unavailable." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}
