import { consentBatchCaptureSchema } from "@gozaika/types";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." }, { status: 401 });
  }

  await supabase.rpc("api_bootstrap_consumer_profile", {
    p_full_name: user.user_metadata.full_name ?? user.user_metadata.name ?? null,
    p_phone_e164: user.phone ?? null,
    p_email_address: user.email ?? null,
    p_default_city_code: "HYD",
    p_preferred_language_code: "en",
  });

  const json = (await request.json().catch(() => ({}))) as unknown;
  const parsed = consentBatchCaptureSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Check the consent choices and try again." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("api_capture_consents", {
    p_events: parsed.data.events.map((event) => ({
      purpose_code: event.purposeCode,
      consent_state_code: event.state,
      policy_version: event.policyVersion,
      capture_source_code: event.source,
      proof_json: event.proofJson,
    })),
  });

  if (error) {
    return NextResponse.json({ ok: false, error: "We could not save consent settings." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}
